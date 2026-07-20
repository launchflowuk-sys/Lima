import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { verifyPassword } from "@/server/auth/password";
import { createSession } from "@/server/auth/session";
import { loadAuthUser } from "@/server/auth/current-user";
import { jsonError } from "@/server/api/http";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

/**
 * Mobile/API login. Returns a bearer token the client stores securely and sends as
 * `Authorization: Bearer <token>` on every subsequent request. Same session model as the web cookie.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(400, "Email and password are required");

  const email = parsed.data.email.toLowerCase().trim();
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !user.passwordHash || !user.isActive || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return jsonError(401, "Invalid email or password");
  }

  const { token, expiresAt } = await createSession(user.id);
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  const authUser = await loadAuthUser(user.id);
  return NextResponse.json({ token, expiresAt, user: authUser });
}
