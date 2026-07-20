import { pgTable, uuid, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { businesses, users } from "./tenancy";

/**
 * Immutable audit trail (spec §26). Append-only by convention — no update/delete path is exposed
 * through the app. Records who did what, which AI model/prompt/knowledge was involved, and the
 * outcome, so every sent reply is traceable end to end.
 */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").references(() => businesses.id, { onDelete: "set null" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    actorType: text("actor_type").notNull().default("user"), // user | automation | system
    action: text("action").notNull(), // mailbox.connected | draft.approved | reply.sent | rule.updated …
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_logs_business_id_idx").on(t.businessId),
    index("audit_logs_action_idx").on(t.action),
    index("audit_logs_created_at_idx").on(t.createdAt),
  ],
);

/** Security-relevant events (login failures, blocked prompt-injection attempts, webhook failures). */
export const securityEvents = pgTable(
  "security_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").references(() => businesses.id, { onDelete: "set null" }),
    kind: text("kind").notNull(),
    severity: text("severity").notNull().default("info"), // info | warning | critical
    detail: jsonb("detail").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("security_events_business_id_idx").on(t.businessId),
    index("security_events_kind_idx").on(t.kind),
  ],
);

/** Senders we never auto-process (loops, abusers). Business-scoped. */
export const blockedSenders = pgTable(
  "blocked_senders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
    address: text("address").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("blocked_senders_business_id_idx").on(t.businessId)],
);

/** Contacts suppressed from all outbound automation (unsubscribes / opt-outs). Business-scoped. */
export const suppressionList = pgTable(
  "suppression_list",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
    address: text("address").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("suppression_list_business_id_idx").on(t.businessId)],
);
