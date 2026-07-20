import { pgEnum, timestamp } from "drizzle-orm/pg-core";

/**
 * Reusable created/updated columns. Every table gets these so audit questions
 * ("when did this change?") always have an answer.
 */
export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// ─── Access control ──────────────────────────────────────────────────────────
export const userRoleEnum = pgEnum("user_role", ["owner", "manager", "agent", "read_only"]);

// ─── Mailboxes / providers ─────────────────────────────────────────────────────
// The provider adapter key. `imap_smtp` is the generic "connect any inbox" provider.
export const mailboxProviderEnum = pgEnum("mailbox_provider", ["gmail", "microsoft", "imap_smtp"]);
export const mailboxStatusEnum = pgEnum("mailbox_status", ["connected", "disconnected", "error", "reauth_required"]);
// Per-mailbox autonomy (spec §15). New mailboxes always default to draft_only.
export const autonomyModeEnum = pgEnum("autonomy_mode", ["draft_only", "controlled_auto_send", "disabled"]);

// ─── Email ─────────────────────────────────────────────────────────────────────
export const messageDirectionEnum = pgEnum("message_direction", ["inbound", "outbound"]);
export const threadStatusEnum = pgEnum("thread_status", [
  "needs_reply",
  "awaiting_approval",
  "draft_prepared",
  "auto_replied",
  "waiting_customer",
  "waiting_internal",
  "escalated",
  "closed",
  "no_reply_required",
]);

// ─── AI classification (spec §11) ────────────────────────────────────────────────
export const intentEnum = pgEnum("email_intent", [
  "general_enquiry", "booking_enquiry", "quote_request", "pricing_question", "complaint",
  "refund_request", "payment_issue", "invoice_request", "document_request", "supplier_communication",
  "contract", "job_application", "spam", "newsletter", "internal_email", "follow_up",
  "cancellation", "rescheduling", "technical_support", "account_access", "other",
]);
export const urgencyEnum = pgEnum("email_urgency", ["low", "normal", "high", "critical"]);
export const sentimentEnum = pgEnum("email_sentiment", ["positive", "neutral", "confused", "frustrated", "angry", "threatening"]);
export const riskLevelEnum = pgEnum("email_risk", ["low", "medium", "high", "prohibited_auto_send"]);

// ─── Reply drafts / approvals ────────────────────────────────────────────────────
export const draftStatusEnum = pgEnum("draft_status", ["pending_approval", "approved", "rejected", "sent", "send_failed", "auto_sent"]);
