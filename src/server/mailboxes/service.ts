import { inArray, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { mailboxes, mailboxHealthEvents } from "@/server/db/schema";
import { type AuthUser, assertPermission, assertBusinessAccess } from "@/server/auth/access";
import { encryptSecret } from "@/server/security/encryption";
import { getProvider } from "@/server/email/providers/registry";
import { recordAudit } from "@/server/audit/log";
import { listBusinessesForUser } from "@/server/businesses/service";
import { syncImapMailbox } from "@/server/email/sync/imap-sync";

export type Mailbox = typeof mailboxes.$inferSelect;

/** Mailboxes across every business the user can access. Never returns another tenant's mailbox. */
export async function listMailboxesForUser(user: AuthUser): Promise<Mailbox[]> {
  const biz = await listBusinessesForUser(user);
  if (!biz.length) return [];
  return db
    .select()
    .from(mailboxes)
    .where(inArray(mailboxes.businessId, biz.map((b) => b.id)))
    .orderBy(mailboxes.emailAddress);
}

export interface ConnectImapInput {
  businessId: string;
  emailAddress: string;
  displayName?: string;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  imapUsername: string;
  imapPassword: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUsername: string;
  smtpPassword: string;
}

/**
 * Connect a generic IMAP/SMTP mailbox — the "add any inbox" flow. Passwords are encrypted before
 * they touch the database; we then live-verify the credentials through the provider and record the
 * outcome (status + health event + audit). Requires `mailbox.connect` in the target business.
 */
export async function connectImapSmtpMailbox(user: AuthUser, input: ConnectImapInput) {
  assertBusinessAccess(user, input.businessId);
  assertPermission(user, input.businessId, "mailbox.connect");

  const [mailbox] = await db
    .insert(mailboxes)
    .values({
      businessId: input.businessId,
      provider: "imap_smtp",
      emailAddress: input.emailAddress.toLowerCase().trim(),
      displayName: input.displayName?.trim() || null,
      status: "disconnected",
      imapHost: input.imapHost.trim(),
      imapPort: input.imapPort,
      imapSecure: input.imapSecure,
      imapUsername: input.imapUsername.trim(),
      imapPasswordEnc: encryptSecret(input.imapPassword),
      smtpHost: input.smtpHost.trim(),
      smtpPort: input.smtpPort,
      smtpSecure: input.smtpSecure,
      smtpUsername: input.smtpUsername.trim(),
      smtpPasswordEnc: encryptSecret(input.smtpPassword),
    })
    .returning();

  let status: "connected" | "error" = "connected";
  let error: string | null = null;
  try {
    await getProvider(mailbox).verifyConnection();
  } catch (e) {
    status = "error";
    error = e instanceof Error ? e.message : "Verification failed";
  }

  await db.update(mailboxes).set({ status }).where(eq(mailboxes.id, mailbox.id));
  await db.insert(mailboxHealthEvents).values({
    mailboxId: mailbox.id,
    kind: status === "connected" ? "connected" : "verify_failed",
    detail: error ? { error } : null,
  });
  await recordAudit({
    businessId: input.businessId,
    actorUserId: user.id,
    action: "mailbox.connected",
    entityType: "mailbox",
    entityId: mailbox.id,
    metadata: { provider: "imap_smtp", emailAddress: mailbox.emailAddress, status },
  });

  return { mailboxId: mailbox.id, status, error };
}

/** Remove a mailbox (and its encrypted credentials). Requires `mailbox.manage`. */
export async function deleteMailbox(user: AuthUser, mailboxId: string): Promise<void> {
  const rows = await db.select().from(mailboxes).where(eq(mailboxes.id, mailboxId)).limit(1);
  const mailbox = rows[0];
  if (!mailbox) return;
  assertBusinessAccess(user, mailbox.businessId);
  assertPermission(user, mailbox.businessId, "mailbox.manage");
  await db.delete(mailboxes).where(eq(mailboxes.id, mailboxId));
  await recordAudit({
    businessId: mailbox.businessId,
    actorUserId: user.id,
    action: "mailbox.deleted",
    entityType: "mailbox",
    entityId: mailboxId,
  });
}

type AutonomyMode = Mailbox["autonomyMode"];

/**
 * Set a mailbox's autonomy mode (spec §15). `controlled_auto_send` is what enables Mode 2 — but even
 * then, every individual reply must still pass the safety policy AND an automation rule before it can
 * actually auto-send. `draft_only` (the default) means every reply waits for a human. Requires
 * `ai.configure` — changing autonomy is a sensitive setting.
 */
export async function setMailboxAutonomy(user: AuthUser, mailboxId: string, mode: AutonomyMode): Promise<void> {
  const rows = await db.select().from(mailboxes).where(eq(mailboxes.id, mailboxId)).limit(1);
  const mailbox = rows[0];
  if (!mailbox) throw new Error("Mailbox not found");
  assertBusinessAccess(user, mailbox.businessId);
  assertPermission(user, mailbox.businessId, "ai.configure");
  await db.update(mailboxes).set({ autonomyMode: mode }).where(eq(mailboxes.id, mailboxId));
  await recordAudit({
    businessId: mailbox.businessId,
    actorUserId: user.id,
    action: "mailbox.autonomy_changed",
    entityType: "mailbox",
    entityId: mailboxId,
    metadata: { from: mailbox.autonomyMode, to: mode },
  });
}

/** Pull new mail for a mailbox now (IMAP). Requires `mailbox.manage`. */
export async function syncMailbox(user: AuthUser, mailboxId: string): Promise<{ ingested: number }> {
  const rows = await db.select().from(mailboxes).where(eq(mailboxes.id, mailboxId)).limit(1);
  const mailbox = rows[0];
  if (!mailbox) throw new Error("Mailbox not found");
  assertBusinessAccess(user, mailbox.businessId);
  assertPermission(user, mailbox.businessId, "mailbox.manage");
  if (mailbox.provider !== "imap_smtp") {
    throw new Error("Live sync is currently available for IMAP/SMTP mailboxes only");
  }
  const result = await syncImapMailbox(mailbox);
  await recordAudit({
    businessId: mailbox.businessId,
    actorUserId: user.id,
    action: "mailbox.synced",
    entityType: "mailbox",
    entityId: mailboxId,
    metadata: { ingested: result.ingested },
  });
  return result;
}
