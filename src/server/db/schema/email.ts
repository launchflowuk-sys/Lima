import { pgTable, uuid, text, boolean, timestamp, integer, jsonb, index, unique } from "drizzle-orm/pg-core";
import { timestamps, messageDirectionEnum, threadStatusEnum } from "./_shared";
import { businesses } from "./tenancy";
import { mailboxes } from "./mailboxes";
import { users } from "./tenancy";

/** A conversation thread within one mailbox. Business-scoped; provider thread id kept for sync. */
export const emailThreads = pgTable(
  "email_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
    mailboxId: uuid("mailbox_id").notNull().references(() => mailboxes.id, { onDelete: "cascade" }),
    providerThreadId: text("provider_thread_id").notNull(),
    subject: text("subject"),
    status: threadStatusEnum("status").notNull().default("needs_reply"),
    assignedUserId: uuid("assigned_user_id").references(() => users.id, { onDelete: "set null" }),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    isRead: boolean("is_read").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index("email_threads_business_id_idx").on(t.businessId),
    index("email_threads_mailbox_id_idx").on(t.mailboxId),
    index("email_threads_status_idx").on(t.status),
    index("email_threads_last_message_at_idx").on(t.lastMessageAt),
    unique("email_threads_provider_unique").on(t.mailboxId, t.providerThreadId),
  ],
);

/** A single message in a thread. Deduplicated by provider message id per mailbox. */
export const emailMessages = pgTable(
  "email_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
    threadId: uuid("thread_id").notNull().references(() => emailThreads.id, { onDelete: "cascade" }),
    mailboxId: uuid("mailbox_id").notNull().references(() => mailboxes.id, { onDelete: "cascade" }),
    providerMessageId: text("provider_message_id").notNull(),
    direction: messageDirectionEnum("direction").notNull(),
    fromAddress: text("from_address"),
    fromName: text("from_name"),
    subject: text("subject"),
    bodyText: text("body_text"),
    bodyHtmlSanitized: text("body_html_sanitized"),
    snippet: text("snippet"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("email_messages_business_id_idx").on(t.businessId),
    index("email_messages_thread_id_idx").on(t.threadId),
    unique("email_messages_provider_unique").on(t.mailboxId, t.providerMessageId),
  ],
);

/** To/cc/bcc participants per message. */
export const emailParticipants = pgTable(
  "email_participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messageId: uuid("message_id").notNull().references(() => emailMessages.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // from | to | cc | bcc
    address: text("address").notNull(),
    name: text("name"),
  },
  (t) => [
    index("email_participants_message_id_idx").on(t.messageId),
    index("email_participants_address_idx").on(t.address),
  ],
);

/** Attachment metadata; the bytes live in object storage (storage/ layer), never in the DB. */
export const emailAttachments = pgTable(
  "email_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
    messageId: uuid("message_id").notNull().references(() => emailMessages.id, { onDelete: "cascade" }),
    filename: text("filename"),
    contentType: text("content_type"),
    sizeBytes: integer("size_bytes"),
    storageKey: text("storage_key"),
    isBlocked: boolean("is_blocked").notNull().default(false),
    blockReason: text("block_reason"),
    ...timestamps,
  },
  (t) => [index("email_attachments_message_id_idx").on(t.messageId)],
);

/** Free-text internal notes on a thread (never shown to the customer). */
export const threadInternalNotes = pgTable(
  "thread_internal_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id").notNull().references(() => emailThreads.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("thread_internal_notes_thread_id_idx").on(t.threadId)],
);
