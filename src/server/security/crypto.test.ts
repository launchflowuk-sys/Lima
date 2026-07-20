import { describe, it, expect } from "vitest";
import { encryptSecret, decryptSecret } from "./encryption";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { hashToken } from "@/server/auth/session";

describe("secret encryption (AES-256-GCM)", () => {
  it("round-trips a value", () => {
    const secret = "gho_super-secret-oauth-token";
    expect(decryptSecret(encryptSecret(secret))).toBe(secret);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    expect(encryptSecret("x")).not.toBe(encryptSecret("x"));
  });

  it("rejects a tampered payload", () => {
    const enc = encryptSecret("hello");
    const tampered = enc.slice(0, -2) + (enc.endsWith("AA") ? "BB" : "AA");
    expect(() => decryptSecret(tampered)).toThrow();
  });
});

describe("password hashing", () => {
  it("never stores the plaintext and verifies correctly", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).not.toContain("correct horse");
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});

describe("session token hashing", () => {
  it("is deterministic and unique per token", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
    expect(hashToken("abc")).toHaveLength(64); // sha-256 hex
  });
});
