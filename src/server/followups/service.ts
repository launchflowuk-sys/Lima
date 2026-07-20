import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db/client";
import { followUps, emailThreads } from "@/server/db/schema";
import { type AuthUser, assertBusinessAccess, assertPermission } from "@/server/auth/access";
import { listBusinessesForUser } from "@/server/businesses/service";
import { recordAudit } from "@/server/audit/log";

export type FollowUp = typeof followUps.$inferSelect;

export interface CreateFollowUpInput {
  businessId: string;
  threadId?: string | null;
  contactId?: string | null;
  dueAt: Date;
  reason: string;
}

/** Schedule a follow-up. Requires `conversation.note` (anyone who can act on a thread can set one). */
export async function createFollowUp(user: AuthUser, input: CreateFollowUpInput): Promise<FollowUp> {
  assertBusinessAccess(user, input.businessId);
  assertPermission(user, input.businessId, "conversation.note");
  const reason = input.reason.trim();
  if (!reason) throw new Error("A reason is required");
  if (Number.isNaN(input.dueAt.getTime())) throw new Error("A valid due date is required");

  const [row] = await db
    .insert(followUps)
    .values({
      businessId: input.businessId,
      threadId: input.threadId ?? null,
      contactId: input.contactId ?? null,
      dueAt: input.dueAt,
      reason,
      createdByUserId: user.id,
    })
    .returning();
  await recordAudit({ businessId: input.businessId, actorUserId: user.id, action: "follow_up.created", entityType: "follow_up", entityId: row.id, metadata: { dueAt: input.dueAt.toISOString() } });
  return row;
}

/** Pending follow-ups across the user's businesses, soonest-due first, with the thread subject. */
export async function listPendingFollowUps(user: AuthUser): Promise<Array<FollowUp & { threadSubject: string | null }>> {
  const businesses = await listBusinessesForUser(user);
  if (!businesses.length) return [];
  const rows = await db
    .select({ f: followUps, threadSubject: emailThreads.subject })
    .from(followUps)
    .leftJoin(emailThreads, eq(followUps.threadId, emailThreads.id))
    .where(and(inArray(followUps.businessId, businesses.map((b) => b.id)), eq(followUps.status, "pending")))
    .orderBy(asc(followUps.dueAt));
  return rows.map((r) => ({ ...r.f, threadSubject: r.threadSubject }));
}

async function transition(user: AuthUser, followUpId: string, status: "completed" | "cancelled"): Promise<void> {
  const [row] = await db.select().from(followUps).where(eq(followUps.id, followUpId)).limit(1);
  if (!row) return;
  assertBusinessAccess(user, row.businessId);
  assertPermission(user, row.businessId, "conversation.note");
  await db
    .update(followUps)
    .set({ status, completedByUserId: status === "completed" ? user.id : null, completedAt: new Date() })
    .where(eq(followUps.id, followUpId));
  await recordAudit({ businessId: row.businessId, actorUserId: user.id, action: `follow_up.${status}`, entityType: "follow_up", entityId: followUpId });
}

export const completeFollowUp = (user: AuthUser, id: string) => transition(user, id, "completed");
export const cancelFollowUp = (user: AuthUser, id: string) => transition(user, id, "cancelled");
