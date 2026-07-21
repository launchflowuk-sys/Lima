import { google } from "googleapis";
import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import { env } from "@/env";

/**
 * Gmail OAuth2 helpers — pure/testable where possible. Owns the consent-URL construction, the
 * code→token exchange, the signed OAuth `state` (a short-lived JWT that carries who started the flow
 * so the callback can trust it), and the account-email lookup. No DB access here; persistence lives
 * in gmail-service.ts. Tokens returned from here are plaintext and MUST be encrypted before storage.
 */

/** Scopes we request. Read + send + the account email (openid/userinfo) so we can label the mailbox. */
export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
] as const;

/** OAuth `state` payload — the business + user that initiated the connect flow. */
export interface OAuthStatePayload {
  businessId: string;
  userId: string;
}

/** Plaintext tokens from Google. `access`/`refresh` are secrets — encrypt before persisting. */
export interface GmailTokens {
  access: string | null;
  refresh: string | null;
  expiryDate: number | null;
  scope: string | null;
}

const STATE_TTL = "10m";

const stateSchema = z.object({
  businessId: z.string().uuid(),
  userId: z.string().uuid(),
});

function stateSecret(): Uint8Array {
  return new TextEncoder().encode(env.SESSION_SECRET);
}

/** True when the Google OAuth client credentials are configured (feature-gates the Connect button). */
export function isGmailConfigured(): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

/** Where Google redirects after consent. Explicit env wins; otherwise derive from APP_URL. */
export function redirectUri(): string {
  return env.GOOGLE_REDIRECT_URI || `${env.APP_URL}/api/oauth/gmail/callback`;
}

/** A configured OAuth2 client. Throws if credentials are missing so callers fail loudly. */
export function createOAuth2Client() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new Error("Google OAuth is not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)");
  }
  return new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, redirectUri());
}

/** Build the Google consent URL. `offline` + `consent` guarantee we receive a refresh token. */
export function buildConsentUrl(state: string): string {
  return createOAuth2Client().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: [...GMAIL_SCOPES],
    state,
  });
}

/** Exchange the one-time authorization code for tokens. */
export async function exchangeCodeForTokens(code: string): Promise<GmailTokens> {
  const { tokens } = await createOAuth2Client().getToken(code);
  return {
    access: tokens.access_token ?? null,
    refresh: tokens.refresh_token ?? null,
    expiryDate: tokens.expiry_date ?? null,
    scope: tokens.scope ?? null,
  };
}

/** Resolve the connected Google account's email (userinfo, falling back to the Gmail profile). */
export async function fetchGoogleAccountEmail(tokens: GmailTokens): Promise<string> {
  const client = createOAuth2Client();
  client.setCredentials({
    access_token: tokens.access ?? undefined,
    refresh_token: tokens.refresh ?? undefined,
    expiry_date: tokens.expiryDate ?? undefined,
    scope: tokens.scope ?? undefined,
  });

  try {
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const profile = await oauth2.userinfo.get();
    if (profile.data.email) return profile.data.email.toLowerCase();
  } catch {
    // Fall through to the Gmail profile lookup below.
  }

  const gmail = google.gmail({ version: "v1", auth: client });
  const profile = await gmail.users.getProfile({ userId: "me" });
  if (!profile.data.emailAddress) {
    throw new Error("Could not determine the Google account email address");
  }
  return profile.data.emailAddress.toLowerCase();
}

/** Sign a short-lived (10 min) HS256 state token binding the flow to the initiating business+user. */
export async function signOAuthState(payload: OAuthStatePayload): Promise<string> {
  return new SignJWT({ businessId: payload.businessId, userId: payload.userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(STATE_TTL)
    .sign(stateSecret());
}

/** Verify + parse the OAuth state token. Throws on tampering, expiry, or an unexpected shape. */
export async function verifyOAuthState(token: string): Promise<OAuthStatePayload> {
  const { payload } = await jwtVerify(token, stateSecret(), { algorithms: ["HS256"] });
  return stateSchema.parse(payload);
}
