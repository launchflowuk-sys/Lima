import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import { env } from "@/env";

/**
 * Microsoft 365 / Outlook OAuth2 helpers — pure/testable where possible. Owns the consent-URL
 * construction, the code→token exchange, the refresh-token grant, the signed OAuth `state` (a
 * short-lived JWT that carries who started the flow so the callback can trust it), and the
 * account-email lookup. Uses plain `fetch` against the Microsoft identity platform + Graph — no MSAL
 * or Graph SDK. No DB access here; persistence lives in microsoft-service.ts. Tokens returned from
 * here are plaintext and MUST be encrypted before storage.
 */

/**
 * Scopes we request. Read + send + the account profile (openid/email/User.Read) so we can label the
 * mailbox; offline_access so we receive a refresh token.
 */
export const MICROSOFT_SCOPES = [
  "openid",
  "email",
  "offline_access",
  "https://graph.microsoft.com/Mail.Read",
  "https://graph.microsoft.com/Mail.Send",
  "https://graph.microsoft.com/User.Read",
] as const;

/** OAuth `state` payload — the business + user that initiated the connect flow. */
export interface OAuthStatePayload {
  businessId: string;
  userId: string;
}

/** Plaintext tokens from Microsoft. `access`/`refresh` are secrets — encrypt before persisting. */
export interface MicrosoftTokens {
  access: string | null;
  refresh: string | null;
  expiryDate: number | null;
  scope: string | null;
}

const STATE_TTL = "10m";
const AUTHORITY = "https://login.microsoftonline.com";
const GRAPH_ME = "https://graph.microsoft.com/v1.0/me";

const stateSchema = z.object({
  businessId: z.string().uuid(),
  userId: z.string().uuid(),
});

function stateSecret(): Uint8Array {
  return new TextEncoder().encode(env.SESSION_SECRET);
}

/** The Azure AD tenant to authenticate against. Defaults to the multi-tenant `common` endpoint. */
export function microsoftTenant(): string {
  return env.MICROSOFT_TENANT_ID || "common";
}

/** True when the Microsoft OAuth client credentials are configured (feature-gates the Connect button). */
export function isMicrosoftConfigured(): boolean {
  return Boolean(env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET);
}

/** Where Microsoft redirects after consent. Explicit env wins; otherwise derive from APP_URL. */
export function redirectUri(): string {
  return env.MICROSOFT_REDIRECT_URI || `${env.APP_URL}/api/oauth/microsoft/callback`;
}

function requireCredentials(): { clientId: string; clientSecret: string } {
  if (!env.MICROSOFT_CLIENT_ID || !env.MICROSOFT_CLIENT_SECRET) {
    throw new Error("Microsoft OAuth is not configured (MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET)");
  }
  return { clientId: env.MICROSOFT_CLIENT_ID, clientSecret: env.MICROSOFT_CLIENT_SECRET };
}

/** Build the Microsoft consent URL. `response_mode=query` so the callback reads code/state from the query string. */
export function buildConsentUrl(state: string): string {
  const { clientId } = requireCredentials();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri(),
    response_mode: "query",
    scope: MICROSOFT_SCOPES.join(" "),
    state,
  });
  return `${AUTHORITY}/${microsoftTenant()}/oauth2/v2.0/authorize?${params.toString()}`;
}

/** Shape of a token-endpoint response. Extra fields (id_token, token_type, …) are ignored. */
interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}

/** POST the token endpoint (form-encoded) and normalise the response into MicrosoftTokens. */
async function postToken(body: URLSearchParams): Promise<MicrosoftTokens> {
  const res = await fetch(`${AUTHORITY}/${microsoftTenant()}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    // Never echo the request body (it carries the client secret / refresh token) into the error.
    throw new Error(`Microsoft token endpoint failed (${res.status})`);
  }
  const data = (await res.json()) as TokenResponse;
  return {
    access: data.access_token ?? null,
    refresh: data.refresh_token ?? null,
    expiryDate: typeof data.expires_in === "number" ? Date.now() + data.expires_in * 1000 : null,
    scope: data.scope ?? null,
  };
}

/** Exchange the one-time authorization code for tokens. */
export async function exchangeCodeForTokens(code: string): Promise<MicrosoftTokens> {
  const { clientId, clientSecret } = requireCredentials();
  return postToken(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(),
      client_id: clientId,
      client_secret: clientSecret,
      scope: MICROSOFT_SCOPES.join(" "),
    }),
  );
}

/** Exchange a refresh token for a fresh access (and possibly refresh) token. */
export async function refreshAccessToken(refreshToken: string): Promise<MicrosoftTokens> {
  const { clientId, clientSecret } = requireCredentials();
  return postToken(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      scope: MICROSOFT_SCOPES.join(" "),
    }),
  );
}

/** Resolve the connected account's email via Graph `/me` (mail, falling back to userPrincipalName). */
export async function fetchMicrosoftAccountEmail(tokens: MicrosoftTokens): Promise<string> {
  if (!tokens.access) throw new Error("Cannot resolve the Microsoft account email without an access token");
  const res = await fetch(`${GRAPH_ME}?$select=mail,userPrincipalName`, {
    headers: { Authorization: `Bearer ${tokens.access}` },
  });
  if (!res.ok) throw new Error(`Microsoft /me lookup failed (${res.status})`);
  const data = (await res.json()) as { mail?: string | null; userPrincipalName?: string | null };
  const email = data.mail || data.userPrincipalName;
  if (!email) throw new Error("Could not determine the Microsoft account email address");
  return email.toLowerCase();
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
