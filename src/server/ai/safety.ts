import type { Classification } from "./schemas";

/** Intents that always require a human, regardless of confidence (spec §16). */
const PROHIBITED_AUTO_SEND_INTENTS = new Set([
  "complaint",
  "refund_request",
  "payment_issue",
  "contract",
  "cancellation",
]);

/** Sentiments that always require a human. */
const PROHIBITED_AUTO_SEND_SENTIMENTS = new Set(["angry", "threatening"]);

export const DEFAULT_CONFIDENCE_THRESHOLD = 0.85;

export interface AutoSendDecision {
  eligible: boolean;
  reason: string | null;
}

/**
 * Decide whether a classified message MAY be auto-sent, independent of the model's own guess. The
 * model's `autoSendEligible` is only ever allowed to REDUCE to false here — this function can never
 * grant auto-send the model didn't ask for, and applies the hard blocks in spec §16. Pure, so every
 * rule is unit-tested. The mailbox/rule-level gates (permitted intent, verified facts, template
 * variables, suppression, loop, rate limit) are layered on top of this in the automation phase.
 */
export function evaluateAutoSend(
  c: Classification,
  opts: { confidenceThreshold?: number } = {},
): AutoSendDecision {
  const threshold = opts.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;

  if (!c.autoSendEligible) return { eligible: false, reason: "Model did not mark this as auto-send eligible" };
  if (c.riskLevel === "prohibited_auto_send") return { eligible: false, reason: "Risk level prohibits auto-send" };
  if (c.riskLevel === "high") return { eligible: false, reason: "High-risk message requires human approval" };
  if (PROHIBITED_AUTO_SEND_INTENTS.has(c.intent)) return { eligible: false, reason: `Intent "${c.intent}" always requires human approval` };
  if (PROHIBITED_AUTO_SEND_SENTIMENTS.has(c.sentiment)) return { eligible: false, reason: `Sentiment "${c.sentiment}" requires human approval` };
  if (c.confidence < threshold) return { eligible: false, reason: `Confidence ${c.confidence} below threshold ${threshold}` };
  if (c.escalationReason) return { eligible: false, reason: `Escalation flagged: ${c.escalationReason}` };

  return { eligible: true, reason: null };
}

/** Apply the decision back onto the classification for storage. */
export function applyAutoSendPolicy(c: Classification, opts?: { confidenceThreshold?: number }): Classification {
  const decision = evaluateAutoSend(c, opts);
  return { ...c, autoSendEligible: decision.eligible };
}
