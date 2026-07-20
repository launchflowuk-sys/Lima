import { eq, inArray, desc, asc } from "drizzle-orm";
import { db } from "@/server/db/client";
import { emailThreads, emailMessages } from "@/server/db/schema";
import { type AuthUser, assertBusinessAccess } from "@/server/auth/access";
import { listBusinessesForUser } from "@/server/businesses/service";

export type Thread = typeof emailThreads.$inferSelect;
export type Message = typeof emailMessages.$inferSelect;

/** Threads across every business the user can access, newest activity first. Tenant-scoped. */
export async function listThreadsForUser(user: AuthUser): Promise<Array<Thread & { businessName: string }>> {
  const businesses = await listBusinessesForUser(user);
  if (!businesses.length) return [];
  const names = new Map(businesses.map((b) => [b.id, b.name]));
  const rows = await db
    .select()
    .from(emailThreads)
    .where(inArray(emailThreads.businessId, businesses.map((b) => b.id)))
    .orderBy(desc(emailThreads.lastMessageAt))
    .limit(200);
  return rows.map((r) => ({ ...r, businessName: names.get(r.businessId) ?? "" }));
}

/** One thread with its messages oldest-first — or null if it doesn't exist / isn't accessible. */
export async function getThreadForUser(
  user: AuthUser,
  threadId: string,
): Promise<{ thread: Thread; messages: Message[] } | null> {
  const rows = await db.select().from(emailThreads).where(eq(emailThreads.id, threadId)).limit(1);
  const thread = rows[0];
  if (!thread) return null;
  assertBusinessAccess(user, thread.businessId);

  const messages = await db
    .select()
    .from(emailMessages)
    .where(eq(emailMessages.threadId, threadId))
    .orderBy(asc(emailMessages.sentAt));

  if (!thread.isRead) {
    await db.update(emailThreads).set({ isRead: true }).where(eq(emailThreads.id, threadId));
  }

  return { thread, messages };
}
