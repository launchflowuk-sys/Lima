import { randomBytes, createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { sessions } from "@/server/db/schema";

export const SESSION_COOKIE = "lima_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Sessions are opaque random tokens. Only the SHA-256 hash is stored, so a database leak never
 * exposes a usable session (same reasoning as password hashing). The raw token lives only in the
 * httpOnly cookie.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ userId, tokenHash: hashToken(token), expiresAt });
  return { token, expiresAt };
}

export async function getSessionUserId(token: string): Promise<string | null> {
  const rows = await db.select().from(sessions).where(eq(sessions.tokenHash, hashToken(token))).limit(1);
  const session = rows[0];
  if (!session || session.expiresAt.getTime() < Date.now()) return null;
  return session.userId;
}

export async function destroySession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}
