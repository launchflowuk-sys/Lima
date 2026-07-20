import { and, desc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { notifications, users } from "@/server/db/schema";
import { type AuthUser } from "@/server/auth/access";
import { sendEmailNotification } from "./channels";

export type Notification = typeof notifications.$inferSelect;

export interface NotifyInput {
  userId: string;
  businessId?: string | null;
  type: string;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
  linkPath?: string;
  /** Also send an email copy to the user (best-effort, only if SMTP is configured). */
  alsoEmail?: boolean;
}

/**
 * Create a notification for a user. Always writes the durable in-app row; when `alsoEmail` is set and
 * SMTP is configured, also emails a copy. Safe to call from the background worker (no auth context).
 */
export async function notifyUser(input: NotifyInput): Promise<void> {
  await db.insert(notifications).values({
    userId: input.userId,
    businessId: input.businessId ?? null,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    linkPath: input.linkPath ?? null,
  });

  if (input.alsoEmail) {
    const [u] = await db.select({ email: users.email }).from(users).where(eq(users.id, input.userId)).limit(1);
    if (u?.email) await sendEmailNotification(u.email, input.title, input.body ?? input.title);
  }
}

export async function listNotifications(user: AuthUser, limit = 50): Promise<Notification[]> {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function unreadNotificationCount(user: AuthUser): Promise<number> {
  return db.$count(notifications, and(eq(notifications.userId, user.id), eq(notifications.isRead, false)));
}

export async function markNotificationRead(user: AuthUser, id: string): Promise<void> {
  await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.id, id), eq(notifications.userId, user.id)));
}

export async function markAllNotificationsRead(user: AuthUser): Promise<void> {
  await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.userId, user.id), eq(notifications.isRead, false)));
}
