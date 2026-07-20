/**
 * Automation rule shapes (spec §7). Conditions and actions are stored as typed JSONB so a rule is a
 * single row, yet the engine stays fully typed. A condition that is undefined/empty is "not constrained";
 * a rule matches only when EVERY specified condition passes (AND semantics).
 */

export type RiskLevel = "low" | "medium" | "high" | "prohibited_auto_send";

/** Risk ordering, so `maxRiskLevel` can mean "this risk or lower". */
export const RISK_ORDER: RiskLevel[] = ["low", "medium", "high", "prohibited_auto_send"];

export interface RuleConditions {
  /** Match if the message's primary OR secondary intent is in this list. */
  intents?: string[];
  /** Never match if the primary intent is in this list (takes precedence over `intents`). */
  excludeIntents?: string[];
  urgencies?: string[];
  sentiments?: string[];
  /** Match only if the classified risk is this level or lower. */
  maxRiskLevel?: RiskLevel;
  /** Case-insensitive substring match on the sender address (any one hit passes). */
  fromContains?: string[];
  subjectContains?: string[];
  bodyContains?: string[];
}

export interface RuleActions {
  /** Permit controlled auto-send for matches. STILL gated by the safety policy + mailbox autonomy. */
  autoSend?: boolean;
  /** Force human approval. Overrides `autoSend` (safety-first) whenever any matched rule sets it. */
  holdForApproval?: boolean;
  /** Flag the thread as escalated (and hold for a human). */
  escalate?: boolean;
  /** Labels to add to the thread. */
  addTags?: string[];
  /** Assign the thread to a user. */
  assignToUserId?: string | null;
}
