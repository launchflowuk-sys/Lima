import { pgTable, uuid, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { businesses, users } from "./tenancy";

/**
 * An in-app notification for a specific user (spec §19). Other channels (email/SMS/push) are delivered
 * by the notifications dispatcher at creation time; this row is the durable in-app copy + read state.
 * `type` is a free string (e.g. follow_up_due, thread_escalated) so new kinds don't need a migration.
 */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    businessId: uuid("business_id").references(() => businesses.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),
    linkPath: text("link_path"),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("notifications_user_id_idx").on(t.userId),
    index("notifications_user_unread_idx").on(t.userId, t.isRead),
  ],
);
