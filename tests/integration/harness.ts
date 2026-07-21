import { describe } from "vitest";
import postgres from "postgres";
import { db } from "@/server/db/client";
import {
  organisations,
  businesses,
  users,
  userBusinessAccess,
  mailboxes,
  emailThreads,
  emailMessages,
} from "@/server/db/schema";
import { hashPassword } from "@/server/auth/password";
import { loadAuthUser } from "@/server/auth/current-user";
import type { AuthUser } from "@/server/auth/access";
import type { Role } from "@/server/auth/rbac";

/**
 * `describe` that is a no-op skip when TEST_DATABASE_URL is unset — so the integration suite is safe
 * to run in any environment (CI without a DB, a fresh clone, etc.) and only actually runs when a real
 * test database is provided. Prefer this over bare `describe` in every integration test file.
 */
export const describeIntegration = process.env.TEST_DATABASE_URL ? describe : describe.skip;

// ─── Raw client (schema reset only) ──────────────────────────────────────────
// A dedicated connection used purely to TRUNCATE between tests. Created lazily so importing this
// module never opens a connection (and never touches a DB when the suite is skipped).
let rawSql: ReturnType<typeof postgres> | null = null;
function raw(): ReturnType<typeof postgres> {
  if (!rawSql) {
    const url = process.env.TEST_DATABASE_URL;
    if (!url) throw new Error("TEST_DATABASE_URL is not set");
    rawSql = postgres(url, { max: 1 });
  }
  return rawSql;
}

/** Truncate every application table (RESTART IDENTITY CASCADE) so each test starts from empty. */
export async function resetDatabase(): Promise<void> {
  if (!process.env.TEST_DATABASE_URL) return;
  const sql = raw();
  const rows = await sql<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename NOT LIKE '__drizzle%'
  `;
  if (rows.length === 0) return;
  const list = rows.map((r) => `"public"."${r.tablename}"`).join(", ");
  await sql.unsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
}

/** Close pooled connections opened by the harness (called from afterAll). */
export async function closeTestDb(): Promise<void> {
  if (rawSql) {
    await rawSql.end();
    rawSql = null;
  }
}

// ─── Fixtures ────────────────────────────────────────────────────────────────
let seq = 0;
const uniq = (): number => ++seq;

export async function createOrganisation(name = `Org ${uniq()}`) {
  const [org] = await db.insert(organisations).values({ name }).returning();
  return org;
}

export interface CreateUserInput {
  organisationId: string;
  email?: string;
  password?: string;
  isOwner?: boolean;
  firstName?: string | null;
  lastName?: string | null;
}

export async function createUser(input: CreateUserInput) {
  const [user] = await db
    .insert(users)
    .values({
      organisationId: input.organisationId,
      email: (input.email ?? `user${uniq()}@example.com`).toLowerCase(),
      passwordHash: input.password ? await hashPassword(input.password) : null,
      firstName: input.firstName ?? "Test",
      lastName: input.lastName ?? null,
      isOwner: input.isOwner ?? false,
    })
    .returning();
  return user;
}

/** Seed an organisation + its owner user in one call (mirrors scripts/seed.ts). */
export async function seedOwner(email: string, password: string, orgName = "LaunchFlow") {
  const org = await createOrganisation(orgName);
  const user = await createUser({ organisationId: org.id, email, password, isOwner: true, firstName: "Owner" });
  return { org, user };
}

export async function createBusiness(organisationId: string, name = `Business ${uniq()}`) {
  const [business] = await db
    .insert(businesses)
    .values({ organisationId, name, slug: `biz-${uniq()}` })
    .returning();
  return business;
}

export async function grantAccess(userId: string, businessId: string, role: Role = "agent") {
  const [row] = await db.insert(userBusinessAccess).values({ userId, businessId, role }).returning();
  return row;
}

export interface CreateMailboxInput {
  businessId: string;
  emailAddress?: string;
  displayName?: string | null;
  provider?: "gmail" | "microsoft" | "imap_smtp";
  status?: "connected" | "disconnected" | "error" | "reauth_required";
  autonomyMode?: "draft_only" | "controlled_auto_send" | "disabled";
}

export async function createMailbox(input: CreateMailboxInput) {
  const [mailbox] = await db
    .insert(mailboxes)
    .values({
      businessId: input.businessId,
      provider: input.provider ?? "imap_smtp",
      emailAddress: input.emailAddress ?? `inbox${uniq()}@example.com`,
      displayName: input.displayName ?? "Support",
      status: input.status ?? "connected",
      autonomyMode: input.autonomyMode ?? "draft_only",
      imapHost: "imap.example.com",
      imapPort: 993,
      imapSecure: true,
      imapUsername: "imap-user",
      smtpHost: "smtp.example.com",
      smtpPort: 587,
      smtpSecure: false,
      smtpUsername: "smtp-user",
    })
    .returning();
  return mailbox;
}

export interface CreateThreadInput {
  businessId: string;
  mailboxId: string;
  subject?: string;
  providerThreadId?: string;
  status?: "needs_reply" | "draft_prepared" | "escalated" | "waiting_customer" | "auto_replied";
}

export async function createThread(input: CreateThreadInput) {
  const [thread] = await db
    .insert(emailThreads)
    .values({
      businessId: input.businessId,
      mailboxId: input.mailboxId,
      providerThreadId: input.providerThreadId ?? `thread-${uniq()}`,
      subject: input.subject ?? "Enquiry",
      status: input.status ?? "needs_reply",
    })
    .returning();
  return thread;
}

export interface CreateMessageInput {
  businessId: string;
  threadId: string;
  mailboxId: string;
  direction?: "inbound" | "outbound";
  fromAddress?: string;
  bodyText?: string;
  sentAt?: Date;
}

export async function createInboundMessage(input: CreateMessageInput) {
  const [message] = await db
    .insert(emailMessages)
    .values({
      businessId: input.businessId,
      threadId: input.threadId,
      mailboxId: input.mailboxId,
      providerMessageId: `msg-${uniq()}`,
      direction: input.direction ?? "inbound",
      fromAddress: input.fromAddress ?? "customer@example.com",
      fromName: "Customer",
      subject: "Enquiry",
      bodyText: input.bodyText ?? "Hello, what are your opening hours?",
      snippet: (input.bodyText ?? "Hello, what are your opening hours?").slice(0, 200),
      sentAt: input.sentAt ?? new Date(),
    })
    .returning();
  return message;
}

/** Build the real AuthUser for a seeded user id (the exact object the app authorises against). */
export async function authUserFor(userId: string): Promise<AuthUser> {
  const user = await loadAuthUser(userId);
  if (!user) throw new Error(`loadAuthUser returned null for ${userId}`);
  return user;
}
