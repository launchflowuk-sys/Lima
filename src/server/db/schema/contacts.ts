import { pgTable, uuid, text, integer, boolean, jsonb, timestamp, index, unique } from "drizzle-orm/pg-core";
import { timestamps, followUpStatusEnum } from "./_shared";
import { businesses, users } from "./tenancy";
import { emailThreads } from "./email";

/**
 * A person who has emailed a business — the customer memory (spec §17). One row per (business, email);
 * auto-created/updated as mail is ingested. `notes` are approved context a human can add that the AI is
 * allowed to use. Tenant-scoped: a contact belongs to exactly one business and is never shared.
 */
export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    name: text("name"),
    phone: text("phone"),
    messageCount: integer("message_count").notNull().default(0),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    notes: text("notes"),
    isBlocked: boolean("is_blocked").notNull().default(false),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("contacts_business_id_idx").on(t.businessId),
    unique("contacts_business_email_unique").on(t.businessId, t.email),
  ],
);

/**
 * A scheduled reminder to follow a thread up (spec §18). Surfaced on /follow-ups when due. A background
 * job to notify on due follow-ups arrives with the notifications phase; the data + UI live here.
 */
export const followUps = pgTable(
  "follow_ups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
    threadId: uuid("thread_id").references(() => emailThreads.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    reason: text("reason").notNull(),
    status: followUpStatusEnum("status").notNull().default("pending"),
    // Set when a "due" notification has been sent, so the scan doesn't re-notify every pass.
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    completedByUserId: uuid("completed_by_user_id").references(() => users.id, { onDelete: "set null" }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("follow_ups_business_id_idx").on(t.businessId),
    index("follow_ups_status_due_idx").on(t.status, t.dueAt),
    index("follow_ups_thread_id_idx").on(t.threadId),
  ],
);
