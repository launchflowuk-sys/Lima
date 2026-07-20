import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db/client";
import { automationRules, automationExecutions, emailThreads } from "@/server/db/schema";
import { type AuthUser, assertBusinessAccess, assertPermission } from "@/server/auth/access";
import { listBusinessesForUser, type Business } from "@/server/businesses/service";
import { recordAudit } from "@/server/audit/log";
import { evaluateRules, type RuleContext, type RuleEvaluation, type RuleForEval } from "./engine";
import type { RuleConditions, RuleActions } from "./types";

export type AutomationRule = typeof automationRules.$inferSelect;

// ─── Rule CRUD ─────────────────────────────────────────────────────────────────────

export async function listRules(user: AuthUser, businessId: string): Promise<AutomationRule[]> {
  assertBusinessAccess(user, businessId);
  return db
    .select()
    .from(automationRules)
    .where(eq(automationRules.businessId, businessId))
    .orderBy(automationRules.priority, desc(automationRules.createdAt));
}

/** Businesses + all their rules, tenant-scoped, for the /automation page. */
export async function listRulesOverview(user: AuthUser): Promise<{ businesses: Business[]; rules: AutomationRule[] }> {
  const businesses = await listBusinessesForUser(user);
  const ids = businesses.map((b) => b.id);
  if (ids.length === 0) return { businesses, rules: [] };
  const rules = await db
    .select()
    .from(automationRules)
    .where(inArray(automationRules.businessId, ids))
    .orderBy(automationRules.priority, desc(automationRules.createdAt));
  return { businesses, rules };
}

export interface CreateRuleInput {
  businessId: string;
  name: string;
  description?: string;
  priority?: number;
  conditions: RuleConditions;
  actions: RuleActions;
  stopOnMatch?: boolean;
  isActive?: boolean;
}

export async function createRule(user: AuthUser, input: CreateRuleInput): Promise<AutomationRule> {
  assertBusinessAccess(user, input.businessId);
  assertPermission(user, input.businessId, "automation.configure");
  const name = input.name.trim();
  if (!name) throw new Error("Rule name is required");

  const [rule] = await db
    .insert(automationRules)
    .values({
      businessId: input.businessId,
      name,
      description: input.description?.trim() || null,
      priority: input.priority ?? 100,
      conditions: input.conditions,
      actions: input.actions,
      stopOnMatch: input.stopOnMatch ?? false,
      isActive: input.isActive ?? true,
      createdByUserId: user.id,
    })
    .returning();

  await recordAudit({
    businessId: input.businessId,
    actorUserId: user.id,
    action: "automation.rule.created",
    entityType: "automation_rule",
    entityId: rule.id,
    metadata: { name, actions: input.actions },
  });
  return rule;
}

export async function setRuleActive(user: AuthUser, ruleId: string, isActive: boolean): Promise<void> {
  const [rule] = await db.select().from(automationRules).where(eq(automationRules.id, ruleId)).limit(1);
  if (!rule) throw new Error("Rule not found");
  assertBusinessAccess(user, rule.businessId);
  assertPermission(user, rule.businessId, "automation.configure");
  await db.update(automationRules).set({ isActive }).where(eq(automationRules.id, ruleId));
  await recordAudit({ businessId: rule.businessId, actorUserId: user.id, action: isActive ? "automation.rule.enabled" : "automation.rule.disabled", entityType: "automation_rule", entityId: ruleId });
}

export async function deleteRule(user: AuthUser, ruleId: string): Promise<void> {
  const [rule] = await db.select().from(automationRules).where(eq(automationRules.id, ruleId)).limit(1);
  if (!rule) return;
  assertBusinessAccess(user, rule.businessId);
  assertPermission(user, rule.businessId, "automation.configure");
  await db.delete(automationRules).where(eq(automationRules.id, ruleId));
  await recordAudit({ businessId: rule.businessId, actorUserId: user.id, action: "automation.rule.deleted", entityType: "automation_rule", entityId: ruleId, metadata: { name: rule.name } });
}

// ─── Evaluation + application ──────────────────────────────────────────────────────

/**
 * Evaluate this business's active rules against a classified message and APPLY the side effects that
 * belong on the thread (tags, assignment, escalation), recording an execution row for auditability.
 * Returns the evaluation so the caller can act on the auto-send / hold decision. Auto-send itself is
 * performed by the caller (drafts service) so all the send gating stays in one place.
 */
export async function applyAutomationForThread(params: {
  businessId: string;
  threadId: string;
  messageId: string | null;
  context: RuleContext;
}): Promise<RuleEvaluation> {
  const rules = await db
    .select()
    .from(automationRules)
    .where(and(eq(automationRules.businessId, params.businessId), eq(automationRules.isActive, true)));

  const forEval: RuleForEval[] = rules.map((r) => ({
    id: r.id,
    priority: r.priority,
    stopOnMatch: r.stopOnMatch,
    conditions: r.conditions,
    actions: r.actions,
  }));
  const evaluation = evaluateRules(forEval, params.context);

  // Apply thread-level effects.
  if (evaluation.matchedRuleIds.length > 0) {
    const [thread] = await db.select().from(emailThreads).where(eq(emailThreads.id, params.threadId)).limit(1);
    if (thread) {
      const nextTags = [...new Set([...(thread.tags ?? []), ...evaluation.tags])];
      const patch: Partial<typeof emailThreads.$inferInsert> = {};
      if (nextTags.length !== (thread.tags ?? []).length) patch.tags = nextTags;
      if (evaluation.assignToUserId && evaluation.assignToUserId !== thread.assignedUserId) patch.assignedUserId = evaluation.assignToUserId;
      if (evaluation.escalate && thread.status !== "escalated") patch.status = "escalated";
      if (Object.keys(patch).length > 0) await db.update(emailThreads).set(patch).where(eq(emailThreads.id, params.threadId));
    }

    await db.insert(automationExecutions).values({
      businessId: params.businessId,
      threadId: params.threadId,
      messageId: params.messageId,
      matchedRuleIds: evaluation.matchedRuleIds,
      outcome: {
        autoSend: evaluation.autoSend,
        holdForApproval: evaluation.holdForApproval,
        escalate: evaluation.escalate,
        tags: evaluation.tags,
      },
    });
  }

  return evaluation;
}
