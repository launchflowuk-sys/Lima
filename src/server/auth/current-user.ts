import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { users, userBusinessAccess } from "@/server/db/schema";
import { getSessionUserId, SESSION_COOKIE } from "./session";
import { ForbiddenError, type AuthUser } from "./access";

/** Resolve the current user from the session cookie, or null if not authenticated. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const userId = await getSessionUserId(token);
  if (!userId) return null;

  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = userRows[0];
  if (!user || !user.isActive) return null;

  const access = await db
    .select({ businessId: userBusinessAccess.businessId, role: userBusinessAccess.role })
    .from(userBusinessAccess)
    .where(eq(userBusinessAccess.userId, user.id));

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    isOwner: user.isOwner,
    organisationId: user.organisationId,
    access,
  };
}

/** Like getCurrentUser but throws if not signed in — for server actions / route handlers. */
export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new ForbiddenError("Not authenticated");
  return user;
}
