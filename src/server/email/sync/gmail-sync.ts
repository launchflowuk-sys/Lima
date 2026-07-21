import { and, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { emailThreads, emailMessages, emailParticipants, emailAttachments, mailboxSyncStates, mailboxHealthEvents } from "@/server/db/schema";
import { upsertContactFromInbound } from "@/server/contacts/service";
import { logger } from "@/server/logger";
import { GmailProvider } from "@/server/email/providers/gmail";
import type { Mailbox, ProviderMessage } from "@/server/email/providers/types";

/**
 * Gmail incremental sync. Reads the stored historyId cursor, asks the provider for changed message
 * ids, fetches + stores each one mirroring the IMAP path's persistence (dedup by
 * (mailbox, providerMessageId); find-or-create thread by (mailbox, providerThreadId); participants;
 * contact memory; attachment metadata). Advances the cursor to the provider's returned historyId.
 * Standalone from imap-sync by design — never import or mutate that file.
 */

// Cap a single run so a first sync can't pull an unbounded number of messages.
const INITIAL_WINDOW = 50;
// Attachment extensions we refuse to store/process (spec §24) — same list as the IMAP path.
const BLOCKED_EXT = /\.(exe|msi|bat|cmd|com|scr|ps1|js|jar|vbs|dll)$/i;

export async function syncGmailMailbox(mailbox: Mailbox): Promise<{ ingested: number; inboundThreadIds: string[] }> {
  const provider = new GmailProvider(mailbox);
  let ingested = 0;
  const inboundThreadIds = new Set<string>();

  try {
    const stateRows = await db
      .select({ cursor: mailboxSyncStates.cursor })
      .from(mailboxSyncStates)
      .where(eq(mailboxSyncStates.mailboxId, mailbox.id))
      .limit(1);
    const cursor = stateRows[0]?.cursor ?? null;

    const { changedMessageIds, cursor: nextCursor } = await provider.listChanges(cursor);

    for (const messageId of changedMessageIds.slice(0, INITIAL_WINDOW)) {
      try {
        const message = await provider.fetchMessage(messageId);
        const result = await storeMessage(mailbox, message);
        if (result.created) {
          ingested += 1;
          if (result.direction === "inbound") inboundThreadIds.add(result.threadId);
        }
      } catch (err) {
        logger.warn({ err, messageId, mailboxId: mailbox.id }, "Failed to fetch/store Gmail message");
      }
    }

    await upsertSyncState(mailbox.id, nextCursor, null);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gmail sync failed";
    await upsertSyncState(mailbox.id, null, message);
    await db.insert(mailboxHealthEvents).values({ mailboxId: mailbox.id, kind: "sync_failed", detail: { error: message } });
    throw err;
  }

  return { ingested, inboundThreadIds: [...inboundThreadIds] };
}

async function storeMessage(
  mailbox: Mailbox,
  message: ProviderMessage,
): Promise<{ created: boolean; threadId: string; direction: "inbound" | "outbound" }> {
  const providerMessageId = message.providerMessageId;

  // Dedup: skip if we already have this message in this mailbox.
  const existing = await db
    .select({ id: emailMessages.id })
    .from(emailMessages)
    .where(and(eq(emailMessages.mailboxId, mailbox.id), eq(emailMessages.providerMessageId, providerMessageId)))
    .limit(1);
  if (existing.length) return { created: false, threadId: "", direction: "inbound" };

  const from = message.from;
  const direction: "inbound" | "outbound" =
    from && from.address === mailbox.emailAddress.toLowerCase() ? "outbound" : "inbound";
  const threadKey = message.providerThreadId;
  const sentAt = message.sentAt;

  // Find or create the thread by the Gmail thread id.
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
        subject: message.subject ?? null,
        status: direction === "inbound" ? "needs_reply" : "waiting_customer",
        lastMessageAt: sentAt,
        isRead: direction === "outbound",
      })
      .returning({ id: emailThreads.id });
    threadId = thread.id;
  } else {
    await db.update(emailThreads).set({ lastMessageAt: sentAt, isRead: false }).where(eq(emailThreads.id, threadId));
  }

  const [stored] = await db
    .insert(emailMessages)
    .values({
      businessId: mailbox.businessId,
      threadId,
      mailboxId: mailbox.id,
      providerMessageId,
      direction,
      fromAddress: from?.address ?? null,
      fromName: from?.name ?? null,
      subject: message.subject ?? null,
      bodyText: message.bodyText ?? null,
      bodyHtmlSanitized: message.bodyHtml ?? null,
      snippet: message.snippet ?? ((message.bodyText ?? "").slice(0, 200) || null),
      sentAt,
    })
    .returning({ id: emailMessages.id });

  const participantRows = [
    ...(from ? [{ role: "from", address: from.address, name: from.name ?? null }] : []),
    ...message.to.map((a) => ({ role: "to", address: a.address.toLowerCase(), name: a.name ?? null })),
    ...message.cc.map((a) => ({ role: "cc", address: a.address.toLowerCase(), name: a.name ?? null })),
  ];
  if (participantRows.length) {
    await db.insert(emailParticipants).values(
      participantRows.map((p) => ({ messageId: stored.id, role: p.role, address: p.address, name: p.name })),
    );
  }

  // Customer memory: record the sender as a contact on inbound mail (spec §17).
  if (direction === "inbound" && from?.address) {
    try {
      await upsertContactFromInbound({ businessId: mailbox.businessId, email: from.address, name: from.name, seenAt: sentAt });
    } catch (err) {
      logger.warn({ err, mailboxId: mailbox.id }, "Failed to upsert contact from inbound Gmail message");
    }
  }

  if (message.attachments.length) {
    await db.insert(emailAttachments).values(
      message.attachments.map((att) => {
        const filename = att.filename;
        const blocked = !!filename && BLOCKED_EXT.test(filename);
        return {
          businessId: mailbox.businessId,
          messageId: stored.id,
          filename,
          contentType: att.contentType,
          sizeBytes: att.sizeBytes,
          storageKey: null,
          isBlocked: blocked,
          blockReason: blocked ? "Executable attachment blocked" : null,
        };
      }),
    );
  }

  return { created: true, threadId, direction };
}

/** Advance/annotate the sync cursor. A null cursor leaves the stored value untouched (mirrors IMAP). */
async function upsertSyncState(mailboxId: string, cursor: string | null, lastError: string | null): Promise<void> {
  const rows = await db
    .select({ id: mailboxSyncStates.id })
    .from(mailboxSyncStates)
    .where(eq(mailboxSyncStates.mailboxId, mailboxId))
    .limit(1);
  if (rows.length) {
    await db
      .update(mailboxSyncStates)
      .set({ ...(cursor !== null ? { cursor } : {}), lastSyncedAt: new Date(), lastError })
      .where(eq(mailboxSyncStates.mailboxId, mailboxId));
  } else {
    await db.insert(mailboxSyncStates).values({ mailboxId, cursor, lastSyncedAt: new Date(), lastError });
  }
}
