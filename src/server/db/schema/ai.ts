import { pgTable, uuid, text, boolean, integer, numeric, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { timestamps, intentEnum, urgencyEnum, sentimentEnum, riskLevelEnum, draftStatusEnum } from "./_shared";
import { businesses, users } from "./tenancy";
import { emailThreads, emailMessages } from "./email";

/** Structured classification output for one inbound message (spec §11). One row per classification run. */
export const emailClassifications = pgTable(
  "email_classifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
    messageId: uuid("message_id").notNull().references(() => emailMessages.id, { onDelete: "cascade" }),
    intent: intentEnum("intent").notNull(),
    secondaryIntent: intentEnum("secondary_intent"),
    urgency: urgencyEnum("urgency").notNull(),
    sentiment: sentimentEnum("sentiment").notNull(),
    riskLevel: riskLevelEnum("risk_level").notNull(),
    replyRequired: boolean("reply_required").notNull().default(true),
    autoSendEligible: boolean("auto_send_eligible").notNull().default(false),
    confidence: numeric("confidence", { precision: 4, scale: 3 }),
    extractedEntities: jsonb("extracted_entities").$type<Record<string, unknown>>(),
    missingInformation: jsonb("missing_information").$type<string[]>(),
    recommendedAction: text("recommended_action"),
    escalationReason: text("escalation_reason"),
    modelUsed: text("model_used"),
    promptVersion: text("prompt_version"),
    ...timestamps,
  },
  (t) => [
    index("email_classifications_business_id_idx").on(t.businessId),
    index("email_classifications_message_id_idx").on(t.messageId),
  ],
);

/**
 * A generated reply awaiting a decision. `status` drives the approval queue. `autoSendBlockedReason`
 * records exactly why auto-send was refused (spec §16) — surfaced in the intelligence panel.
 * `knowledgeUsed` records which knowledge records fed the reply (every reply must record this).
 */
export const replyDrafts = pgTable(
  "reply_drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
    threadId: uuid("thread_id").notNull().references(() => emailThreads.id, { onDelete: "cascade" }),
    inReplyToMessageId: uuid("in_reply_to_message_id").references(() => emailMessages.id, { onDelete: "set null" }),
    status: draftStatusEnum("status").notNull().default("pending_approval"),
    subject: text("subject"),
    bodyText: text("body_text").notNull(),
    autoSendEligible: boolean("auto_send_eligible").notNull().default(false),
    autoSendBlockedReason: text("auto_send_blocked_reason"),
    knowledgeUsed: jsonb("knowledge_used").$type<string[]>(),
    approvedByUserId: uuid("approved_by_user_id").references(() => users.id, { onDelete: "set null" }),
    sentProviderMessageId: text("sent_provider_message_id"),
    sendError: text("send_error"),
    ...timestamps,
  },
  (t) => [
    index("reply_drafts_business_id_idx").on(t.businessId),
    index("reply_drafts_thread_id_idx").on(t.threadId),
    index("reply_drafts_status_idx").on(t.status),
  ],
);

/** Immutable version history of a draft's body (original AI text → each human edit). */
export const replyVersions = pgTable(
  "reply_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    draftId: uuid("draft_id").notNull().references(() => replyDrafts.id, { onDelete: "cascade" }),
    bodyText: text("body_text").notNull(),
    editedByUserId: uuid("edited_by_user_id").references(() => users.id, { onDelete: "set null" }),
    isAiGenerated: boolean("is_ai_generated").notNull().default(false),
    ...timestamps,
  },
  (t) => [index("reply_versions_draft_id_idx").on(t.draftId)],
);

/** Per-call AI token + cost accounting (spec §27 estimated AI cost). */
export const aiUsageRecords = pgTable(
  "ai_usage_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").references(() => businesses.id, { onDelete: "set null" }),
    purpose: text("purpose").notNull(), // classification | reply | embedding …
    model: text("model").notNull(),
    promptTokens: integer("prompt_tokens"),
    completionTokens: integer("completion_tokens"),
    estimatedCostUsd: numeric("estimated_cost_usd", { precision: 10, scale: 6 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ai_usage_records_business_id_idx").on(t.businessId)],
);
