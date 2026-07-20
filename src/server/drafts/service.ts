import { asc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { emailThreads, emailMessages, emailClassifications, replyDrafts, businesses, mailboxes, aiUsageRecords } from "@/server/db/schema";
import { type AuthUser, assertBusinessAccess, assertPermission } from "@/server/auth/access";
import { classifyThread } from "@/server/ai/classify";
import { evaluateAutoSend } from "@/server/ai/safety";
import { getAiProvider } from "@/server/ai";
import type { AiUsage, ThreadMessageForAi } from "@/server/ai/provider";
import { retrieveBusinessContext } from "@/server/knowledge/service";
import { applyAutomationForThread } from "@/server/automation/service";
import { autoSendDraft } from "@/server/approvals/service";
import { recordAudit } from "@/server/audit/log";
import { logger } from "@/server/logger";

async function recordAiUsage(businessId: string, purpose: string, usage: AiUsage) {
  await db.insert(aiUsageRecords).values({
    businessId,
    purpose,
    model: usage.model,
    promptTokens: usage.promptTokens ?? null,
    completionTokens: usage.completionTokens ?? null,
  });
}

/**
 * Classify the thread and draft a reply, persisting both. The draft lands as `pending_approval`
 * with the auto-send decision + reason attached (spec §16). Requires `reply.edit`. Needs a
 * configured AI provider (OPENAI_API_KEY) to run.
 */
export async function generateDraftForThread(user: AuthUser, threadId: string) {
  const [thread] = await db.select().from(emailThreads).where(eq(emailThreads.id, threadId)).limit(1);
  if (!thread) throw new Error("Thread not found");
  assertBusinessAccess(user, thread.businessId);
  assertPermission(user, thread.businessId, "reply.edit");

  const [business] = await db.select().from(businesses).where(eq(businesses.id, thread.businessId)).limit(1);
  const msgs = await db.select().from(emailMessages).where(eq(emailMessages.threadId, threadId)).orderBy(asc(emailMessages.sentAt));
  if (!msgs.length) throw new Error("This thread has no messages to reply to");
  const latestInbound = [...msgs].reverse().find((m) => m.direction === "inbound") ?? msgs[msgs.length - 1];

  const threadForAi: ThreadMessageForAi[] = msgs.map((m) => ({
    from: m.fromAddress ?? "unknown",
    direction: m.direction,
    sentAt: m.sentAt ? m.sentAt.toISOString() : null,
    body: m.bodyText ?? m.snippet ?? "",
  }));

  // Retrieve the approved business facts relevant to this thread. The query is the latest inbound
  // message plus the subject — that's what the reply must actually address. Only THIS business's
  // knowledge is ever loaded (tenant isolation). Empty string if the business has no knowledge yet.
  const retrievalQuery = [thread.subject, latestInbound.bodyText ?? latestInbound.snippet ?? ""]
    .filter(Boolean)
    .join("\n");
  const { context: businessContext, usedChunkIds } = await retrieveBusinessContext(thread.businessId, retrievalQuery);
  const provider = getAiProvider();

  const { classification, usage: clsUsage, promptVersion: clsVer } = await classifyThread(provider, {
    businessName: business?.name ?? "",
    businessContext,
    thread: threadForAi,
  });

  await db.insert(emailClassifications).values({
    businessId: thread.businessId,
    messageId: latestInbound.id,
    intent: classification.intent,
    secondaryIntent: classification.secondaryIntent,
    urgency: classification.urgency,
    sentiment: classification.sentiment,
    riskLevel: classification.riskLevel,
    replyRequired: classification.replyRequired,
    autoSendEligible: classification.autoSendEligible,
    confidence: String(classification.confidence),
    extractedEntities: classification.extractedEntities,
    missingInformation: classification.missingInformation,
    recommendedAction: classification.recommendedAction,
    escalationReason: classification.escalationReason,
    modelUsed: clsUsage.model,
    promptVersion: clsVer,
  });
  await recordAiUsage(thread.businessId, "classification", clsUsage);

  const reply = await provider.generateReply({
    businessName: business?.name ?? "",
    businessTone: business?.replyTone ?? null,
    businessContext,
    signature: business?.emailSignature ?? null,
    thread: threadForAi,
    classification,
  });
  const decision = evaluateAutoSend(classification);

  const [draft] = await db
    .insert(replyDrafts)
    .values({
      businessId: thread.businessId,
      threadId,
      inReplyToMessageId: latestInbound.id,
      status: "pending_approval",
      subject: thread.subject ? `Re: ${thread.subject.replace(/^re:\s*/i, "")}` : null,
      bodyText: reply.bodyText,
      autoSendEligible: decision.eligible,
      autoSendBlockedReason: decision.reason,
      knowledgeUsed: usedChunkIds,
    })
    .returning();
  await recordAiUsage(thread.businessId, "reply", reply.usage);

  // Run the business's automation rules over this message: apply thread effects (tags/assign/escalate)
  // and get the auto-send / hold decision. Then decide whether Mode 2 (controlled auto-send) fires.
  const evaluation = await applyAutomationForThread({
    businessId: thread.businessId,
    threadId,
    messageId: latestInbound.id,
    context: {
      intent: classification.intent,
      secondaryIntent: classification.secondaryIntent ?? null,
      urgency: classification.urgency,
      sentiment: classification.sentiment,
      riskLevel: classification.riskLevel,
      fromAddress: latestInbound.fromAddress ?? null,
      subject: thread.subject ?? null,
      bodyText: latestInbound.bodyText ?? latestInbound.snippet ?? null,
    },
  });

  const [mailbox] = await db.select().from(mailboxes).where(eq(mailboxes.id, thread.mailboxId)).limit(1);
  const autoSendAllowed =
    decision.eligible && // safety policy (spec §16) — the hard gate
    evaluation.autoSend && // an automation rule permitted it and nothing forced a hold/escalation
    mailbox?.autonomyMode === "controlled_auto_send"; // the mailbox is actually in Mode 2

  let autoSent = false;
  if (autoSendAllowed) {
    try {
      await autoSendDraft(draft.id);
      autoSent = true;
    } catch (err) {
      // Auto-send failed at the provider — fall back to human approval rather than losing the reply.
      logger.error({ err, draftId: draft.id }, "auto-send failed; leaving draft for approval");
    }
  }

  // Thread status: auto-send already set auto_replied; escalation already set escalated; otherwise the
  // reply is waiting for a human.
  if (!autoSent && !evaluation.escalate) {
    await db.update(emailThreads).set({ status: "draft_prepared" }).where(eq(emailThreads.id, threadId));
  }

  await recordAudit({
    businessId: thread.businessId,
    actorUserId: user.id,
    action: "draft.generated",
    entityType: "reply_draft",
    entityId: draft.id,
    metadata: {
      intent: classification.intent,
      autoSendEligible: decision.eligible,
      autoSent,
      matchedRules: evaluation.matchedRuleIds.length,
      escalated: evaluation.escalate,
    },
  });

  const [fresh] = await db.select().from(replyDrafts).where(eq(replyDrafts.id, draft.id)).limit(1);
  return fresh ?? draft;
}
