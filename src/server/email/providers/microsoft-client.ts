import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { mailboxes } from "@/server/db/schema";
import { encryptSecret, decryptSecret } from "@/server/security/encryption";
import { logger } from "@/server/logger";
import { refreshAccessToken, type MicrosoftTokens } from "./microsoft-oauth";
import type { Mailbox } from "./types";

/**
 * Builds an authenticated Microsoft Graph client for a mailbox from its encrypted OAuth tokens.
 * Graph access tokens expire (~1h); this client refreshes them itself (there is no Graph SDK doing it
 * for us). When the stored token is stale — or a request comes back 401 — it swaps the refresh token
 * for a fresh access token, re-encrypts and persists the new access/refresh/expiry back to the
 * mailbox row, and retries once. Refresh tokens are only overwritten when Microsoft returns a new one.
 * Token material is never logged.
 */

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
// Refresh a little before actual expiry so an in-flight request never races the boundary.
const EXPIRY_SKEW_MS = 60_000;

/** A thin authenticated Graph client. `request` accepts a Graph path or an absolute URL (delta/next links). */
export interface GraphClient {
  request(pathOrUrl: string, init?: RequestInit): Promise<Response>;
  requestJson<T>(pathOrUrl: string, init?: RequestInit): Promise<T>;
}

/** Re-encrypt and persist refreshed tokens for a mailbox. Never logs token material. */
export async function persistRefreshedTokens(mailboxId: string, tokens: MicrosoftTokens): Promise<void> {
  const update: Partial<typeof mailboxes.$inferInsert> = {};
  if (tokens.access) update.oauthAccessTokenEnc = encryptSecret(tokens.access);
  if (tokens.refresh) update.oauthRefreshTokenEnc = encryptSecret(tokens.refresh);
  if (typeof tokens.expiryDate === "number") update.oauthExpiresAt = new Date(tokens.expiryDate);
  if (tokens.scope) update.oauthScope = tokens.scope;
  if (Object.keys(update).length === 0) return;
  await db.update(mailboxes).set(update).where(eq(mailboxes.id, mailboxId));
}

/** Build a Graph client authenticated as `mailbox`, wiring up automatic token refresh + persistence. */
export async function authedGraphClient(mailbox: Mailbox): Promise<GraphClient> {
  if (!mailbox.oauthRefreshTokenEnc && !mailbox.oauthAccessTokenEnc) {
    throw new Error("Microsoft mailbox has no stored OAuth credentials");
  }

  let accessToken = mailbox.oauthAccessTokenEnc ? decryptSecret(mailbox.oauthAccessTokenEnc) : null;
  const refreshToken = mailbox.oauthRefreshTokenEnc ? decryptSecret(mailbox.oauthRefreshTokenEnc) : null;
  let expiresAt = mailbox.oauthExpiresAt ? mailbox.oauthExpiresAt.getTime() : null;

  /** Swap the refresh token for a fresh access token, persist it, and adopt it in-memory. */
  async function refreshAndPersist(): Promise<boolean> {
    if (!refreshToken) return false;
    const tokens = await refreshAccessToken(refreshToken);
    if (tokens.access) accessToken = tokens.access;
    if (typeof tokens.expiryDate === "number") expiresAt = tokens.expiryDate;
    try {
      await persistRefreshedTokens(mailbox.id, tokens);
    } catch (err) {
      logger.warn({ err, mailboxId: mailbox.id }, "Failed to persist refreshed Microsoft tokens");
    }
    return Boolean(tokens.access);
  }

  /** Ensure we hold a non-stale access token before making a request. */
  async function ensureToken(): Promise<string> {
    const stale = !accessToken || (expiresAt !== null && expiresAt <= Date.now() + EXPIRY_SKEW_MS);
    if (stale) await refreshAndPersist();
    if (!accessToken) throw new Error("Microsoft mailbox has no usable access token");
    return accessToken;
  }

  async function request(pathOrUrl: string, init: RequestInit = {}): Promise<Response> {
    const token = await ensureToken();
    const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${GRAPH_BASE}${pathOrUrl}`;
    const doFetch = (bearer: string): Promise<Response> => {
      const headers = new Headers(init.headers);
      headers.set("Authorization", `Bearer ${bearer}`);
      headers.set("Accept", "application/json");
      if (init.body !== undefined && init.body !== null && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
      return fetch(url, { ...init, headers });
    };

    let res = await doFetch(token);
    // A 401 means the token went stale mid-flight — refresh once and retry.
    if (res.status === 401 && (await refreshAndPersist()) && accessToken) {
      res = await doFetch(accessToken);
    }
    return res;
  }

  async function requestJson<T>(pathOrUrl: string, init?: RequestInit): Promise<T> {
    const res = await request(pathOrUrl, init);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Graph request failed (${res.status}) for ${redactUrl(pathOrUrl)}: ${detail.slice(0, 300)}`);
    }
    return (await res.json()) as T;
  }

  return { request, requestJson };
}

/** Strip query strings (delta/skip tokens can be long + sensitive) from a URL for error logging. */
function redactUrl(pathOrUrl: string): string {
  const q = pathOrUrl.indexOf("?");
  return q === -1 ? pathOrUrl : `${pathOrUrl.slice(0, q)}?…`;
}
