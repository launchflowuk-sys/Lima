import { describe, it, expect } from "vitest";
import { SignJWT } from "jose";
import { MICROSOFT_SCOPES, signOAuthState, verifyOAuthState } from "./microsoft-oauth";

const BUSINESS_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";

// Mirrors microsoft-oauth.ts (SESSION_SECRET, HS256) so we can forge tokens for the negative cases.
function secret(): Uint8Array {
  return new TextEncoder().encode(process.env.SESSION_SECRET);
}

describe("MICROSOFT_SCOPES", () => {
  it("requests read and send access", () => {
    expect(MICROSOFT_SCOPES).toContain("https://graph.microsoft.com/Mail.Read");
    expect(MICROSOFT_SCOPES).toContain("https://graph.microsoft.com/Mail.Send");
  });

  it("requests offline_access so a refresh token is issued", () => {
    expect(MICROSOFT_SCOPES).toContain("offline_access");
  });
});

describe("OAuth state signing", () => {
  it("round-trips a valid state token", async () => {
    const token = await signOAuthState({ businessId: BUSINESS_ID, userId: USER_ID });
    const parsed = await verifyOAuthState(token);
    expect(parsed).toEqual({ businessId: BUSINESS_ID, userId: USER_ID });
  });

  it("rejects a tampered token", async () => {
    const token = await signOAuthState({ businessId: BUSINESS_ID, userId: USER_ID });
    const tampered = token.slice(0, -2) + (token.endsWith("aa") ? "bb" : "aa");
    await expect(verifyOAuthState(tampered)).rejects.toThrow();
  });

  it("rejects an expired token", async () => {
    const expired = await new SignJWT({ businessId: BUSINESS_ID, userId: USER_ID })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(secret());
    await expect(verifyOAuthState(expired)).rejects.toThrow();
  });

  it("rejects a token whose payload has the wrong shape", async () => {
    const badShape = await new SignJWT({ businessId: "not-a-uuid", userId: USER_ID })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("10m")
      .sign(secret());
    await expect(verifyOAuthState(badShape)).rejects.toThrow();
  });
});
