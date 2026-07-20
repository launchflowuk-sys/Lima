import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { emailMessages, emailThreads, replyDrafts, followUps, emailClassifications, aiUsageRecords } from "@/server/db/schema";
import { type AuthUser } from "@/server/auth/access";
import { listBusinessesForUser } from "@/server/businesses/service";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}
function daysAgo(n: number): Date {
  const d = startOfToday();
  d.setDate(d.getDate() - n);
  return d;
}

/** Count helper — returns 0 for an empty result. */
async function scalar(query: Promise<Array<{ value: number }>>): Promise<number> {
  const rows = await query;
  return Number(rows[0]?.value ?? 0);
}

export interface DashboardStats {
  hasBusiness: boolean;
  emailsReceivedToday: number;
  repliesSentToday: number;
  awaitingApproval: number;
  needsAttention: number;
  autoSentToday: number;
  autoSendRate: number | null; // 0..1 of today's sent replies that were auto-sent
  escalated: number;
  followUpsDueToday: number;
}

/** Operational KPIs across all businesses the user can see. Scoped so no other tenant is counted. */
export async function getDashboardStats(user: AuthUser): Promise<DashboardStats> {
  const businesses = await listBusinessesForUser(user);
  const ids = businesses.map((b) => b.id);
  const empty: DashboardStats = {
    hasBusiness: businesses.length > 0,
    emailsReceivedToday: 0,
    repliesSentToday: 0,
    awaitingApproval: 0,
    needsAttention: 0,
    autoSentToday: 0,
    autoSendRate: null,
    escalated: 0,
    followUpsDueToday: 0,
  };
  if (ids.length === 0) return empty;

  const inBiz = inArray(emailMessages.businessId, ids);
  const today = startOfToday();

  const [received, sent, autoSent, awaiting, needs, escalated, followUpsDue] = await Promise.all([
    scalar(db.select({ value: sql<number>`count(*)` }).from(emailMessages).where(and(inBiz, eq(emailMessages.direction, "inbound"), gte(emailMessages.sentAt, today)))),
    scalar(db.select({ value: sql<number>`count(*)` }).from(emailMessages).where(and(inBiz, eq(emailMessages.direction, "outbound"), gte(emailMessages.sentAt, today)))),
    scalar(db.select({ value: sql<number>`count(*)` }).from(replyDrafts).where(and(inArray(replyDrafts.businessId, ids), eq(replyDrafts.status, "auto_sent"), gte(replyDrafts.updatedAt, today)))),
    scalar(db.select({ value: sql<number>`count(*)` }).from(replyDrafts).where(and(inArray(replyDrafts.businessId, ids), eq(replyDrafts.status, "pending_approval")))),
    scalar(db.select({ value: sql<number>`count(*)` }).from(emailThreads).where(and(inArray(emailThreads.businessId, ids), eq(emailThreads.status, "needs_reply")))),
    scalar(db.select({ value: sql<number>`count(*)` }).from(emailThreads).where(and(inArray(emailThreads.businessId, ids), eq(emailThreads.status, "escalated")))),
    scalar(db.select({ value: sql<number>`count(*)` }).from(followUps).where(and(inArray(followUps.businessId, ids), eq(followUps.status, "pending"), lte(followUps.dueAt, endOfToday())))),
  ]);

  return {
    hasBusiness: true,
    emailsReceivedToday: received,
    repliesSentToday: sent,
    awaitingApproval: awaiting,
    needsAttention: needs,
    autoSentToday: autoSent,
    autoSendRate: sent > 0 ? autoSent / sent : null,
    escalated,
    followUpsDueToday: followUpsDue,
  };
}

export interface AnalyticsReport {
  hasBusiness: boolean;
  windowDays: number;
  totalReceived: number;
  totalSent: number;
  autoSentCount: number;
  autoSendRate: number | null;
  intentBreakdown: Array<{ intent: string; count: number }>;
  sentimentBreakdown: Array<{ sentiment: string; count: number }>;
  estimatedAiCostUsd: number;
}

/** Richer analytics over a rolling window (default 30 days) across the user's businesses. */
export async function getAnalytics(user: AuthUser, windowDays = 30): Promise<AnalyticsReport> {
  const businesses = await listBusinessesForUser(user);
  const ids = businesses.map((b) => b.id);
  const empty: AnalyticsReport = {
    hasBusiness: businesses.length > 0,
    windowDays,
    totalReceived: 0,
    totalSent: 0,
    autoSentCount: 0,
    autoSendRate: null,
    intentBreakdown: [],
    sentimentBreakdown: [],
    estimatedAiCostUsd: 0,
  };
  if (ids.length === 0) return empty;
  const since = daysAgo(windowDays);

  const [received, sent, autoSent, intents, sentiments, cost] = await Promise.all([
    scalar(db.select({ value: sql<number>`count(*)` }).from(emailMessages).where(and(inArray(emailMessages.businessId, ids), eq(emailMessages.direction, "inbound"), gte(emailMessages.sentAt, since)))),
    scalar(db.select({ value: sql<number>`count(*)` }).from(emailMessages).where(and(inArray(emailMessages.businessId, ids), eq(emailMessages.direction, "outbound"), gte(emailMessages.sentAt, since)))),
    scalar(db.select({ value: sql<number>`count(*)` }).from(replyDrafts).where(and(inArray(replyDrafts.businessId, ids), eq(replyDrafts.status, "auto_sent"), gte(replyDrafts.updatedAt, since)))),
    db
      .select({ intent: emailClassifications.intent, count: sql<number>`count(*)` })
      .from(emailClassifications)
      .where(and(inArray(emailClassifications.businessId, ids), gte(emailClassifications.createdAt, since)))
      .groupBy(emailClassifications.intent)
      .orderBy(sql`count(*) desc`),
    db
      .select({ sentiment: emailClassifications.sentiment, count: sql<number>`count(*)` })
      .from(emailClassifications)
      .where(and(inArray(emailClassifications.businessId, ids), gte(emailClassifications.createdAt, since)))
      .groupBy(emailClassifications.sentiment)
      .orderBy(sql`count(*) desc`),
    scalar(db.select({ value: sql<number>`coalesce(sum(${aiUsageRecords.estimatedCostUsd}), 0)` }).from(aiUsageRecords).where(and(inArray(aiUsageRecords.businessId, ids), gte(aiUsageRecords.createdAt, since)))),
  ]);

  return {
    hasBusiness: true,
    windowDays,
    totalReceived: received,
    totalSent: sent,
    autoSentCount: autoSent,
    autoSendRate: sent > 0 ? autoSent / sent : null,
    intentBreakdown: intents.map((r) => ({ intent: r.intent, count: Number(r.count) })),
    sentimentBreakdown: sentiments.map((r) => ({ sentiment: r.sentiment, count: Number(r.count) })),
    estimatedAiCostUsd: Number(cost),
  };
}
