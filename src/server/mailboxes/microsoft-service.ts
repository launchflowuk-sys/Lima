import { and, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { mailboxes, mailboxSyncStates, mailboxHealthEvents } from "@/server/db/schema";
import { type AuthUser, assertBusinessAccess, assertPermission } from "@/server/auth/access";
import { encryptSecret } from "@/server/security/encryption";
import { recordAudit } from "@/server/audit/log";

/**
 * Persist a Microsoft 365 connection after a successful OAuth exchange. Upserts by
 * (businessId, emailAddress) so re-connecting the same inbox refreshes tokens instead of erroring on
 * the unique constraint. All token material is encrypted before it touches the DB. Kept separate from
 * the IMAP-heavy mailboxes/service.ts to keep both files small and focused.
 */

export interface ConnectMicrosoftInput {
  user: AuthUser;
  businessId: string;
  emailAddress: string;
  tokens: {
    access: string | null;
    refresh: string | null;
    expiryDate: number | null;
    scope: string | null;
  };
}

export async function connectMicrosoftMailbox(input: ConnectMicrosoftInput): Promise<{ mailboxId: string }> {
  const { user, businessId, tokens } = input;
  assertBusinessAccess(user, businessId);
  assertPermission(user, businessId, "mailbox.connect");

  const emailAddress = input.emailAddress.toLowerCase().trim();
  const expiresAt = tokens.expiryDate ? new Date(tokens.expiryDate) : null;
  const accessEnc = tokens.access ? encryptSecret(tokens.access) : null;
  const refreshEnc = tokens.refresh ? encryptSecret(tokens.refresh) : null;

  const existing = await db
    .select({ id: mailboxes.id })
    .from(mailboxes)
    .where(and(eq(mailboxes.businessId, businessId), eq(mailboxes.emailAddress, emailAddress)))
    .limit(1);

  let mailboxId: string;
  if (existing[0]) {
    mailboxId = existing[0].id;
    await db
      .update(mailboxes)
      .set({
        provider: "microsoft",
        status: "connected",
        oauthAccessTokenEnc: accessEnc,
        // Only overwrite the refresh token when Microsoft returned a fresh one (it may omit it on re-consent).
        ...(refreshEnc ? { oauthRefreshTokenEnc: refreshEnc } : {}),
        oauthExpiresAt: expiresAt,
        oauthScope: tokens.scope,
      })
      .where(eq(mailboxes.id, mailboxId));
  } else {
    const [inserted] = await db
      .insert(mailboxes)
      .values({
        businessId,
        provider: "microsoft",
        emailAddress,
        status: "connected",
        oauthAccessTokenEnc: accessEnc,
        oauthRefreshTokenEnc: refreshEnc,
        oauthExpiresAt: expiresAt,
        oauthScope: tokens.scope,
      })
      .returning({ id: mailboxes.id });
    mailboxId = inserted.id;
  }

  // Seed the sync-state row (cursor null ⇒ initial pull on first sync) if it doesn't exist yet.
  const state = await db
    .select({ id: mailboxSyncStates.id })
    .from(mailboxSyncStates)
    .where(eq(mailboxSyncStates.mailboxId, mailboxId))
    .limit(1);
  if (!state.length) {
    await db.insert(mailboxSyncStates).values({ mailboxId, cursor: null });
  }

  await db.insert(mailboxHealthEvents).values({ mailboxId, kind: "connected", detail: { provider: "microsoft" } });
  await recordAudit({
    businessId,
    actorUserId: user.id,
    action: "mailbox.connected",
    entityType: "mailbox",
    entityId: mailboxId,
    metadata: { provider: "microsoft", emailAddress },
  });

  return { mailboxId };
}
