import { pgTable, uuid, text, boolean, timestamp, index, unique } from "drizzle-orm/pg-core";
import { timestamps, userRoleEnum } from "./_shared";

/** Top-level account (a LaunchFlow customer). Owns one or more businesses. */
export const organisations = pgTable("organisations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  ...timestamps,
});

/**
 * A single business/brand (Grays CabLine, AMO Services…). THE tenant boundary — almost every
 * other table carries `business_id` and all data access is scoped to it. Data from one business
 * must never be used when replying from another (non-negotiable requirement).
 */
export const businesses = pgTable(
  "businesses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organisationId: uuid("organisation_id").notNull().references(() => organisations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    replyTone: text("reply_tone"),
    emailSignature: text("email_signature"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index("businesses_organisation_id_idx").on(t.organisationId),
    unique("businesses_org_slug_unique").on(t.organisationId, t.slug),
  ],
);

/** A person who can log in. Global identity; per-business access is granted via userBusinessAccess. */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organisationId: uuid("organisation_id").notNull().references(() => organisations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    passwordHash: text("password_hash"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    // Org-wide owners bypass per-business grants; everyone else is scoped by userBusinessAccess.
    isOwner: boolean("is_owner").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    unique("users_email_unique").on(t.email),
    index("users_organisation_id_idx").on(t.organisationId),
  ],
);

/** Per-business role grant. Absence of a row = no access to that business (enforced server-side). */
export const userBusinessAccess = pgTable(
  "user_business_access",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
    role: userRoleEnum("role").notNull().default("read_only"),
    ...timestamps,
  },
  (t) => [
    unique("user_business_unique").on(t.userId, t.businessId),
    index("user_business_access_business_id_idx").on(t.businessId),
    index("user_business_access_user_id_idx").on(t.userId),
  ],
);

/** Server-side session records (opaque token hash stored, never the raw token). */
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [
    unique("sessions_token_hash_unique").on(t.tokenHash),
    index("sessions_user_id_idx").on(t.userId),
    index("sessions_expires_at_idx").on(t.expiresAt),
  ],
);

/** Pending team invitations (accepted via /accept-invitation). */
export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organisationId: uuid("organisation_id").notNull().references(() => organisations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: userRoleEnum("role").notNull().default("read_only"),
    tokenHash: text("token_hash").notNull(),
    invitedByUserId: uuid("invited_by_user_id").references(() => users.id, { onDelete: "set null" }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [
    unique("invitations_token_hash_unique").on(t.tokenHash),
    index("invitations_organisation_id_idx").on(t.organisationId),
  ],
);
