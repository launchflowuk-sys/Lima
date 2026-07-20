import { RISK_ORDER, type RiskLevel, type RuleConditions, type RuleActions } from "./types";

/**
 * Pure automation engine. No I/O — given the classified message context and the business's rules, it
 * decides what should happen. Kept pure so every matching/merging rule is exhaustively unit-testable.
 */

export interface RuleContext {
  intent: string;
  secondaryIntent?: string | null;
  urgency: string;
  sentiment: string;
  riskLevel: RiskLevel;
  fromAddress: string | null;
  subject: string | null;
  bodyText: string | null;
}

export interface RuleForEval {
  id: string;
  priority: number;
  stopOnMatch: boolean;
  conditions: RuleConditions;
  actions: RuleActions;
}

export interface RuleEvaluation {
  matchedRuleIds: string[];
  /** Effective auto-send permission from rules: a rule allowed it AND none forced a hold/escalation. */
  autoSend: boolean;
  holdForApproval: boolean;
  escalate: boolean;
  tags: string[];
  assignToUserId: string | null;
}

function includesCI(haystack: string | null, needles: string[]): boolean {
  if (!haystack) return false;
  const h = haystack.toLowerCase();
  return needles.some((n) => h.includes(n.toLowerCase()));
}

/** Does a single rule's conditions match the context? All specified conditions must pass (AND). */
export function ruleMatches(conditions: RuleConditions, ctx: RuleContext): boolean {
  const c = conditions;

  if (c.excludeIntents?.length && c.excludeIntents.includes(ctx.intent)) return false;

  if (c.intents?.length) {
    const hit = c.intents.includes(ctx.intent) || (ctx.secondaryIntent ? c.intents.includes(ctx.secondaryIntent) : false);
    if (!hit) return false;
  }
  if (c.urgencies?.length && !c.urgencies.includes(ctx.urgency)) return false;
  if (c.sentiments?.length && !c.sentiments.includes(ctx.sentiment)) return false;

  if (c.maxRiskLevel) {
    const max = RISK_ORDER.indexOf(c.maxRiskLevel);
    const actual = RISK_ORDER.indexOf(ctx.riskLevel);
    if (actual > max) return false;
  }

  if (c.fromContains?.length && !includesCI(ctx.fromAddress, c.fromContains)) return false;
  if (c.subjectContains?.length && !includesCI(ctx.subject, c.subjectContains)) return false;
  if (c.bodyContains?.length && !includesCI(ctx.bodyText, c.bodyContains)) return false;

  return true;
}

/**
 * Evaluate all rules against the context. Rules run in ascending `priority` (ties broken by id for
 * determinism). Matched rules' actions merge: `holdForApproval`/`escalate` are sticky-true and win over
 * `autoSend`; tags union; assignment is last-writer-wins. `stopOnMatch` halts further evaluation.
 */
export function evaluateRules(rules: RuleForEval[], ctx: RuleContext): RuleEvaluation {
  const ordered = [...rules].sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));

  const matchedRuleIds: string[] = [];
  let anyAutoSend = false;
  let holdForApproval = false;
  let escalate = false;
  const tags = new Set<string>();
  let assignToUserId: string | null = null;

  for (const rule of ordered) {
    if (!ruleMatches(rule.conditions, ctx)) continue;
    matchedRuleIds.push(rule.id);
    const a = rule.actions;
    if (a.autoSend) anyAutoSend = true;
    if (a.holdForApproval) holdForApproval = true;
    if (a.escalate) {
      escalate = true;
      holdForApproval = true; // escalation always means a human handles it
    }
    if (a.addTags) for (const t of a.addTags) tags.add(t);
    if (a.assignToUserId !== undefined && a.assignToUserId !== null) assignToUserId = a.assignToUserId;
    if (rule.stopOnMatch) break;
  }

  return {
    matchedRuleIds,
    autoSend: anyAutoSend && !holdForApproval && !escalate,
    holdForApproval,
    escalate,
    tags: [...tags],
    assignToUserId,
  };
}
