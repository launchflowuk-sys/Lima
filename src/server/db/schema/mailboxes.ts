import { pgTable, uuid, text, boolean, timestamp, jsonb, integer, index, unique } from "drizzle-orm/pg-core";
import { timestamps, mailboxProviderEnum, mailboxStatusEnum, autonomyModeEnum } from "./_shared";
import { businesses } from "./tenancy";

/**
 * A connected inbox. `provider` selects which EmailProvider adapter handles it — gmail, microsoft,
 * or the generic imap_smtp (any host). Provider-specific connection details live in the encrypted
 * columns below rather than sprawling nullable columns, so adding a provider later needs no schema
 * change. Secrets (OAuth refresh tokens, IMAP/SMTP passwords) are ALWAYS stored encrypted — see
 * security/encryption.ts. Never store a token in plain text.
 */
export const mailboxes = pgTable(
  "mailboxes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
    provider: mailboxProviderEnum("provider").notNull(),
    emailAddress: text("email_address").notNull(),
    displayName: text("display_name"),
    status: mailboxStatusEnum("status").notNull().default("disconnected"),
    // Autonomy defaults to draft_only for every new mailbox (spec §15 — safety first).
    autonomyMode: autonomyModeEnum("autonomy_mode").notNull().default("draft_only"),

    // Encrypted OAuth material (gmail / microsoft). Ciphertext only.
    oauthAccessTokenEnc: text("oauth_access_token_enc"),
    oauthRefreshTokenEnc: text("oauth_refresh_token_enc"),
    oauthExpiresAt: timestamp("oauth_expires_at", { withTimezone: true }),
    oauthScope: text("oauth_scope"),

    // Generic IMAP/SMTP connection config (imap_smtp provider). Host/port/user are plain; the
    // password lives encrypted in imapPasswordEnc / smtpPasswordEnc.
    imapHost: text("imap_host"),
    imapPort: integer("imap_port"),
    imapSecure: boolean("imap_secure").default(true),
    imapUsername: text("imap_username"),
    imapPasswordEnc: text("imap_password_enc"),
    smtpHost: text("smtp_host"),
    smtpPort: integer("smtp_port"),
    smtpSecure: boolean("smtp_secure").default(true),
    smtpUsername: text("smtp_username"),
    smtpPasswordEnc: text("smtp_password_enc"),

    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index("mailboxes_business_id_idx").on(t.businessId),
    index("mailboxes_provider_idx").on(t.provider),
    unique("mailboxes_business_email_unique").on(t.businessId, t.emailAddress),
  ],
);

/**
 * Per-mailbox sync cursor. Gmail stores a historyId; Microsoft a delta token; IMAP a UID/modseq.
 * Kept generic so every provider persists exactly what it needs to resume without reprocessing.
 */
export const mailboxSyncStates = pgTable(
  "mailbox_sync_states",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mailboxId: uuid("mailbox_id").notNull().references(() => mailboxes.id, { onDelete: "cascade" }),
    cursor: text("cursor"), // historyId / deltaToken / uidvalidity:uid
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    lastError: text("last_error"),
    ...timestamps,
  },
  (t) => [unique("mailbox_sync_states_mailbox_unique").on(t.mailboxId)],
);

/** Push-notification subscription (Gmail watch / Graph subscription) with its renewal deadline. */
export const mailboxSubscriptions = pgTable(
  "mailbox_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mailboxId: uuid("mailbox_id").notNull().references(() => mailboxes.id, { onDelete: "cascade" }),
    providerSubscriptionId: text("provider_subscription_id"),
    clientState: text("client_state"), // Graph webhook validation secret
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("mailbox_subscriptions_mailbox_id_idx").on(t.mailboxId)],
);

/** Health/connection event log for the system-health page and reconnection alerts. */
export const mailboxHealthEvents = pgTable(
  "mailbox_health_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mailboxId: uuid("mailbox_id").notNull().references(() => mailboxes.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // connected | disconnected | oauth_expired | sync_failed | subscription_renewed …
    detail: jsonb("detail").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("mailbox_health_events_mailbox_id_idx").on(t.mailboxId)],
);
