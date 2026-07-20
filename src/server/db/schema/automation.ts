import { pgTable, uuid, text, boolean, integer, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { timestamps } from "./_shared";
import { businesses, users } from "./tenancy";
import { emailThreads, emailMessages } from "./email";
import type { RuleConditions, RuleActions } from "@/server/automation/types";

/**
 * A per-business automation rule (spec §7). Rules are evaluated in `priority` order (ascending) after
 * a message is classified; a matched rule contributes its actions. `stopOnMatch` halts evaluation of
 * lower-priority rules. Conditions/actions are typed JSONB (see automation/types.ts).
 */
export const automationRules = pgTable(
  "automation_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    priority: integer("priority").notNull().default(100),
    conditions: jsonb("conditions").$type<RuleConditions>().notNull().default({}),
    actions: jsonb("actions").$type<RuleActions>().notNull().default({}),
    stopOnMatch: boolean("stop_on_match").notNull().default(false),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    index("automation_rules_business_id_idx").on(t.businessId),
    index("automation_rules_active_idx").on(t.businessId, t.isActive),
  ],
);

/**
 * An immutable record of an automation evaluation against one message: which rules matched and what
 * was applied. Powers "why did this happen?" on a thread and the automation analytics.
 */
export const automationExecutions = pgTable(
  "automation_executions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
    threadId: uuid("thread_id").references(() => emailThreads.id, { onDelete: "cascade" }),
    messageId: uuid("message_id").references(() => emailMessages.id, { onDelete: "set null" }),
    matchedRuleIds: jsonb("matched_rule_ids").$type<string[]>().notNull().default([]),
    outcome: jsonb("outcome").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("automation_executions_business_id_idx").on(t.businessId),
    index("automation_executions_thread_id_idx").on(t.threadId),
  ],
);
