import { google, type gmail_v1 } from "googleapis";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { mailboxes } from "@/server/db/schema";
import { encryptSecret, decryptSecret } from "@/server/security/encryption";
import { logger } from "@/server/logger";
import { createOAuth2Client } from "./gmail-oauth";
import type { Mailbox } from "./types";

/**
 * Builds an authenticated Gmail API client for a mailbox from its encrypted OAuth tokens. The
 * google-auth-library refreshes the access token automatically when it is stale; we listen for the
 * resulting `tokens` event and persist the fresh (re-encrypted) access token + expiry back to the
 * mailbox row so the next request starts from a valid token. Refresh tokens are only overwritten
 * when Google actually returns a new one.
 */

/** The subset of the refreshed credentials we care about. Structural to avoid a hard type import. */
interface RefreshedTokens {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
}

/** Re-encrypt and persist refreshed tokens for a mailbox. Never logs token material. */
export async function persistRefreshedTokens(mailboxId: string, tokens: RefreshedTokens): Promise<void> {
  const update: Partial<typeof mailboxes.$inferInsert> = {};
  if (tokens.access_token) update.oauthAccessTokenEnc = encryptSecret(tokens.access_token);
  if (tokens.refresh_token) update.oauthRefreshTokenEnc = encryptSecret(tokens.refresh_token);
  if (typeof tokens.expiry_date === "number") update.oauthExpiresAt = new Date(tokens.expiry_date);
  if (Object.keys(update).length === 0) return;
  await db.update(mailboxes).set(update).where(eq(mailboxes.id, mailboxId));
}

/** Build a Gmail v1 client authenticated as `mailbox`, wiring up automatic token persistence. */
export async function authedGmailClient(mailbox: Mailbox): Promise<gmail_v1.Gmail> {
  if (!mailbox.oauthRefreshTokenEnc && !mailbox.oauthAccessTokenEnc) {
    throw new Error("Gmail mailbox has no stored OAuth credentials");
  }

  const client = createOAuth2Client();
  client.setCredentials({
    access_token: mailbox.oauthAccessTokenEnc ? decryptSecret(mailbox.oauthAccessTokenEnc) : undefined,
    refresh_token: mailbox.oauthRefreshTokenEnc ? decryptSecret(mailbox.oauthRefreshTokenEnc) : undefined,
    expiry_date: mailbox.oauthExpiresAt ? mailbox.oauthExpiresAt.getTime() : undefined,
    scope: mailbox.oauthScope ?? undefined,
  });

  client.on("tokens", (tokens) => {
    void persistRefreshedTokens(mailbox.id, tokens).catch((err: unknown) => {
      logger.warn({ err, mailboxId: mailbox.id }, "Failed to persist refreshed Gmail tokens");
    });
  });

  return google.gmail({ version: "v1", auth: client });
}
