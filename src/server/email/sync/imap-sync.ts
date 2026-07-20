import { ImapFlow } from "imapflow";
import { simpleParser, type AddressObject, type ParsedMail } from "mailparser";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { emailThreads, emailMessages, emailParticipants, emailAttachments, mailboxSyncStates, mailboxHealthEvents } from "@/server/db/schema";
import { decryptSecret } from "@/server/security/encryption";
import { upsertContactFromInbound } from "@/server/contacts/service";
import { logger } from "@/server/logger";
import type { mailboxes } from "@/server/db/schema";
import type { InferSelectModel } from "drizzle-orm";

type Mailbox = InferSelectModel<typeof mailboxes>;

// Cap the very first sync so a large mailbox doesn't pull thousands of messages at once.
const INITIAL_WINDOW = 50;
// Attachment extensions we refuse to store/process (spec §24).
const BLOCKED_EXT = /\.(exe|msi|bat|cmd|com|scr|ps1|js|jar|vbs|dll)$/i;

interface Addr {
  address: string;
  name: string | null;
}

function normaliseAddresses(field: AddressObject | AddressObject[] | undefined): Addr[] {
  if (!field) return [];
  const objs = Array.isArray(field) ? field : [field];
  return objs.flatMap((o) => o.value).map((v) => ({ address: (v.address ?? "").toLowerCase(), name: v.name || null })).filter((a) => a.address);
}

/** Strip Re:/Fwd: so replies land on the same thread when headers are missing. */
function normaliseSubject(subject: string | undefined): string {
  return (subject ?? "").replace(/^\s*(re|fwd|fw)\s*:\s*/gi, "").trim().toLowerCase();
}

/** Thread key: the root message-id from References/In-Reply-To, else the normalised subject. */
function computeThreadKey(parsed: ParsedMail): string {
  const refs = parsed.references;
  if (refs && refs.length) return Array.isArray(refs) ? refs[0] : refs;
  if (parsed.inReplyTo) return parsed.inReplyTo;
  const subj = normaliseSubject(parsed.subject);
  return subj ? `subj:${subj}` : `msg:${parsed.messageId ?? Math.random().toString(36)}`;
}

function makeClient(mailbox: Mailbox): ImapFlow {
  if (!mailbox.imapHost || !mailbox.imapPort || !mailbox.imapUsername || !mailbox.imapPasswordEnc) {
    throw new Error("IMAP is not fully configured for this mailbox");
  }
  return new ImapFlow({
    host: mailbox.imapHost,
    port: mailbox.imapPort,
    secure: mailbox.imapSecure ?? true,
    auth: { user: mailbox.imapUsername, pass: decryptSecret(mailbox.imapPasswordEnc) },
    logger: false,
  });
}

/**
 * Pull new messages from a mailbox's INBOX over IMAP and store them as threads/messages/
 * participants/attachment-metadata. Deduplicates by (mailbox, provider message id) so re-running is
 * safe. Advances the stored cursor (uidValidity:lastUid) so each run only fetches what's new.
 * Provider-specific by design — Gmail/Microsoft get their own history/delta sync in their phases.
 */
export async function syncImapMailbox(mailbox: Mailbox): Promise<{ ingested: number }> {
  const client = makeClient(mailbox);
  let ingested = 0;

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const uidValidity = String(client.mailbox && typeof client.mailbox !== "boolean" ? client.mailbox.uidValidity : "0");
      const uidNext = client.mailbox && typeof client.mailbox !== "boolean" ? Number(client.mailbox.uidNext) : 1;

      const stateRows = await db.select().from(mailboxSyncStates).where(eq(mailboxSyncStates.mailboxId, mailbox.id)).limit(1);
      const prev = stateRows[0]?.cursor ?? null;
      const [prevValidity, prevUid] = (prev ?? "").split(":");

      let sinceUid: number;
      if (prev && prevValidity === uidValidity && prevUid) {
        sinceUid = Number(prevUid) + 1; // resume after the last seen UID
      } else {
        sinceUid = Math.max(1, uidNext - INITIAL_WINDOW); // first sync: recent window only
      }

      let maxUid = sinceUid - 1;
      for await (const msg of client.fetch(`${sinceUid}:*`, { uid: true, source: true }, { uid: true })) {
        if (msg.uid > maxUid) maxUid = msg.uid;
        if (!msg.source) continue;
        try {
          const parsed = await simpleParser(msg.source);
          const created = await storeMessage(mailbox, parsed, msg.uid);
          if (created) ingested += 1;
        } catch (err) {
          logger.warn({ err, uid: msg.uid, mailboxId: mailbox.id }, "Failed to parse/store IMAP message");
        }
      }

      const cursor = `${uidValidity}:${Math.max(maxUid, sinceUid - 1)}`;
      await upsertSyncState(mailbox.id, cursor, null);
    } finally {
      lock.release();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "IMAP sync failed";
    await upsertSyncState(mailbox.id, null, message);
    await db.insert(mailboxHealthEvents).values({ mailboxId: mailbox.id, kind: "sync_failed", detail: { error: message } });
    throw err;
  } finally {
    try { await client.logout(); } catch { /* already closed */ }
  }

  return { ingested };
}

async function storeMessage(mailbox: Mailbox, parsed: ParsedMail, uid: number): Promise<boolean> {
  const providerMessageId = parsed.messageId ?? `uid:${uid}`;

  // Dedup: skip if we already have this message in this mailbox.
  const existing = await db
    .select({ id: emailMessages.id })
    .from(emailMessages)
    .where(and(eq(emailMessages.mailboxId, mailbox.id), eq(emailMessages.providerMessageId, providerMessageId)))
    .limit(1);
  if (existing.length) return false;

  const from = normaliseAddresses(parsed.from)[0] ?? null;
  const to = normaliseAddresses(parsed.to);
  const cc = normaliseAddresses(parsed.cc);
  const direction: "inbound" | "outbound" = from && from.address === mailbox.emailAddress.toLowerCase() ? "outbound" : "inbound";
  const threadKey = computeThreadKey(parsed);
  const sentAt = parsed.date ?? null;

  // Find or create the thread.
  const threadRows = await db
    .select()
    .from(emailThreads)
    .where(and(eq(emailThreads.mailboxId, mailbox.id), eq(emailThreads.providerThreadId, threadKey)))
    .limit(1);
  let threadId = threadRows[0]?.id;
  if (!threadId) {
    const [thread] = await db
      .insert(emailThreads)
      .values({
        businessId: mailbox.businessId,
        mailboxId: mailbox.id,
        providerThreadId: threadKey,
        subject: parsed.subject ?? null,
        status: direction === "inbound" ? "needs_reply" : "waiting_customer",
        lastMessageAt: sentAt,
        isRead: direction === "outbound",
      })
      .returning({ id: emailThreads.id });
    threadId = thread.id;
  } else {
    await db.update(emailThreads).set({ lastMessageAt: sentAt, isRead: false }).where(eq(emailThreads.id, threadId));
  }

  const [message] = await db
    .insert(emailMessages)
    .values({
      businessId: mailbox.businessId,
      threadId,
      mailboxId: mailbox.id,
      providerMessageId,
      direction,
      fromAddress: from?.address ?? null,
      fromName: from?.name ?? null,
      subject: parsed.subject ?? null,
      bodyText: parsed.text ?? null,
      bodyHtmlSanitized: typeof parsed.html === "string" ? parsed.html : null,
      snippet: (parsed.text ?? "").slice(0, 200) || null,
      sentAt,
    })
    .returning({ id: emailMessages.id });

  const participantRows = [
    ...(from ? [{ role: "from", ...from }] : []),
    ...to.map((a) => ({ role: "to", ...a })),
    ...cc.map((a) => ({ role: "cc", ...a })),
  ];
  if (participantRows.length) {
    await db.insert(emailParticipants).values(
      participantRows.map((p) => ({ messageId: message.id, role: p.role, address: p.address, name: p.name })),
    );
  }

  // Customer memory: record the sender as a contact on inbound mail (spec §17).
  if (direction === "inbound" && from?.address) {
    try {
      await upsertContactFromInbound({ businessId: mailbox.businessId, email: from.address, name: from.name, seenAt: sentAt });
    } catch (err) {
      logger.warn({ err, mailboxId: mailbox.id }, "Failed to upsert contact from inbound message");
    }
  }

  if (parsed.attachments?.length) {
    await db.insert(emailAttachments).values(
      parsed.attachments.map((att) => {
        const filename = att.filename ?? null;
        const blocked = !!filename && BLOCKED_EXT.test(filename);
        return {
          businessId: mailbox.businessId,
          messageId: message.id,
          filename,
          contentType: att.contentType ?? null,
          sizeBytes: att.size ?? null,
          storageKey: null,
          isBlocked: blocked,
          blockReason: blocked ? "Executable attachment blocked" : null,
        };
      }),
    );
  }

  return true;
}

async function upsertSyncState(mailboxId: string, cursor: string | null, lastError: string | null): Promise<void> {
  const rows = await db.select({ id: mailboxSyncStates.id }).from(mailboxSyncStates).where(eq(mailboxSyncStates.mailboxId, mailboxId)).limit(1);
  if (rows.length) {
    await db
      .update(mailboxSyncStates)
      .set({ ...(cursor !== null ? { cursor } : {}), lastSyncedAt: new Date(), lastError })
      .where(eq(mailboxSyncStates.mailboxId, mailboxId));
  } else {
    await db.insert(mailboxSyncStates).values({ mailboxId, cursor, lastSyncedAt: new Date(), lastError });
  }
}
