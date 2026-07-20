import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db/client";
import { replyDrafts, replyVersions, emailThreads, emailMessages, mailboxes } from "@/server/db/schema";
import { type AuthUser, assertBusinessAccess, assertPermission } from "@/server/auth/access";
import { listBusinessesForUser } from "@/server/businesses/service";
import { getProvider } from "@/server/email/providers/registry";
import { recordAudit } from "@/server/audit/log";

export type ReplyDraft = typeof replyDrafts.$inferSelect;

/** Drafts awaiting approval across the user's businesses, with the thread subject for context. */
export async function listPendingDrafts(user: AuthUser): Promise<Array<ReplyDraft & { threadSubject: string | null }>> {
  const businesses = await listBusinessesForUser(user);
  if (!businesses.length) return [];
  const rows = await db
    .select({ draft: replyDrafts, threadSubject: emailThreads.subject })
    .from(replyDrafts)
    .innerJoin(emailThreads, eq(replyDrafts.threadId, emailThreads.id))
    .where(and(inArray(replyDrafts.businessId, businesses.map((b) => b.id)), eq(replyDrafts.status, "pending_approval")))
    .orderBy(desc(replyDrafts.createdAt));
  return rows.map((r) => ({ ...r.draft, threadSubject: r.threadSubject }));
}

interface SendActor {
  userId: string | null;
  actorType: "user" | "automation";
}

/**
 * The ONE code path that dispatches mail. Loads the thread/mailbox/recipient, sends via the mailbox
 * provider, then records the outbound message, flips draft + thread status, and audits — all with the
 * given actor (a human approver or the automation system). `auto` selects auto_sent/auto_replied vs
 * sent/waiting_customer. On provider failure the draft is marked send_failed and the error re-thrown.
 */
async function deliverDraft(draft: ReplyDraft, body: string, actor: SendActor, auto: boolean): Promise<{ providerMessageId: string }> {
  const [thread] = await db.select().from(emailThreads).where(eq(emailThreads.id, draft.threadId)).limit(1);
  if (!thread) throw new Error("Thread not found");
  const [mailbox] = await db.select().from(mailboxes).where(eq(mailboxes.id, thread.mailboxId)).limit(1);
  if (!mailbox) throw new Error("Mailbox not found");

  const msgs = await db.select().from(emailMessages).where(eq(emailMessages.threadId, thread.id)).orderBy(asc(emailMessages.sentAt));
  const lastInbound = [...msgs].reverse().find((m) => m.direction === "inbound");
  const to = lastInbound?.fromAddress;
  if (!to) throw new Error("No recipient address found on this thread");

  const subject = draft.subject ?? `Re: ${thread.subject ?? ""}`.trim();
  let providerMessageId: string;
  try {
    const result = await getProvider(mailbox).sendReply({
      providerThreadId: thread.providerThreadId,
      inReplyToProviderMessageId: lastInbound?.providerMessageId,
      to: [to],
      subject,
      bodyText: body,
    });
    providerMessageId = result.providerMessageId;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Send failed";
    await db.update(replyDrafts).set({ status: "send_failed", sendError: message }).where(eq(replyDrafts.id, draft.id));
    await recordAudit({ businessId: draft.businessId, actorUserId: actor.userId, actorType: actor.actorType, action: "reply.send_failed", entityType: "reply_draft", entityId: draft.id, metadata: { error: message, auto } });
    throw new Error(message);
  }

  await db
    .update(replyDrafts)
    .set({ status: auto ? "auto_sent" : "sent", approvedByUserId: actor.userId, sentProviderMessageId: providerMessageId })
    .where(eq(replyDrafts.id, draft.id));

  await db.insert(emailMessages).values({
    businessId: draft.businessId,
    threadId: thread.id,
    mailboxId: mailbox.id,
    providerMessageId,
    direction: "outbound",
    fromAddress: mailbox.emailAddress,
    fromName: mailbox.displayName,
    subject,
    bodyText: body,
    snippet: body.slice(0, 200),
    sentAt: new Date(),
  });
  await db
    .update(emailThreads)
    .set({ status: auto ? "auto_replied" : "waiting_customer", lastMessageAt: new Date() })
    .where(eq(emailThreads.id, thread.id));

  await recordAudit({
    businessId: draft.businessId,
    actorUserId: actor.userId,
    actorType: actor.actorType,
    action: auto ? "reply.auto_sent" : "reply.sent",
    entityType: "reply_draft",
    entityId: draft.id,
    metadata: { providerMessageId },
  });
  return { providerMessageId };
}

/**
 * Approve a draft and send it through the thread's mailbox provider, behind an explicit human approval
 * and a `reply.send` permission check. An optional `finalBody` lets the approver edit before sending
 * (stored as a new immutable version).
 */
export async function approveAndSendDraft(user: AuthUser, draftId: string, finalBody?: string) {
  const [draft] = await db.select().from(replyDrafts).where(eq(replyDrafts.id, draftId)).limit(1);
  if (!draft) throw new Error("Draft not found");
  assertBusinessAccess(user, draft.businessId);
  assertPermission(user, draft.businessId, "reply.send");
  if (draft.status !== "pending_approval") throw new Error(`Draft is already ${draft.status}`);

  const body = finalBody?.trim() || draft.bodyText;
  if (finalBody && finalBody.trim() && finalBody.trim() !== draft.bodyText) {
    await db.insert(replyVersions).values({ draftId: draft.id, bodyText: body, editedByUserId: user.id, isAiGenerated: false });
    await db.update(replyDrafts).set({ bodyText: body }).where(eq(replyDrafts.id, draft.id));
  }

  return deliverDraft(draft, body, { userId: user.id, actorType: "user" }, false);
}

/**
 * System auto-send (Mode 2). NO user + no permission check here on purpose: the decision to auto-send
 * is made upstream by the safety policy + automation rules + mailbox autonomy, and only then is this
 * called. It refuses anything that isn't still pending approval, so it can't double-send.
 */
export async function autoSendDraft(draftId: string): Promise<{ providerMessageId: string }> {
  const [draft] = await db.select().from(replyDrafts).where(eq(replyDrafts.id, draftId)).limit(1);
  if (!draft) throw new Error("Draft not found");
  if (draft.status !== "pending_approval") throw new Error(`Draft is already ${draft.status}`);
  return deliverDraft(draft, draft.bodyText, { userId: null, actorType: "automation" }, true);
}

/** Reject a draft (no send). Requires `reply.approve`. */
export async function rejectDraft(user: AuthUser, draftId: string) {
  const [draft] = await db.select().from(replyDrafts).where(eq(replyDrafts.id, draftId)).limit(1);
  if (!draft) return;
  assertBusinessAccess(user, draft.businessId);
  assertPermission(user, draft.businessId, "reply.approve");
  await db.update(replyDrafts).set({ status: "rejected", approvedByUserId: user.id }).where(eq(replyDrafts.id, draftId));
  await recordAudit({ businessId: draft.businessId, actorUserId: user.id, action: "draft.rejected", entityType: "reply_draft", entityId: draftId });
}
