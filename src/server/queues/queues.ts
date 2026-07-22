import { Queue } from "bullmq";
import { getRedisConnection } from "./connection";

/** Queue names — one place so the web app (producer) and worker (consumer) never drift. */
export const QUEUE_SYNC = "mailbox-sync";
export const QUEUE_DRAFT = "draft-generation";
export const QUEUE_DRAFT_SCAN = "draft-scan";
export const QUEUE_FOLLOWUP = "follow-up-scan";

export interface SyncJob {
  /** A specific mailbox to sync. Omit for the periodic "scan all connected mailboxes" job. */
  mailboxId?: string;
}
export interface DraftJob {
  threadId: string;
}

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 5000 },
  removeOnComplete: 500,
  removeOnFail: 1000,
};

let syncQueue: Queue<SyncJob> | null = null;
let draftQueue: Queue<DraftJob> | null = null;
let draftScanQueue: Queue | null = null;
let followUpQueue: Queue | null = null;

export function getSyncQueue(): Queue<SyncJob> {
  if (!syncQueue) syncQueue = new Queue<SyncJob>(QUEUE_SYNC, { connection: getRedisConnection(), defaultJobOptions });
  return syncQueue;
}
export function getDraftQueue(): Queue<DraftJob> {
  if (!draftQueue) draftQueue = new Queue<DraftJob>(QUEUE_DRAFT, { connection: getRedisConnection(), defaultJobOptions });
  return draftQueue;
}
export function getDraftScanQueue(): Queue {
  if (!draftScanQueue) draftScanQueue = new Queue(QUEUE_DRAFT_SCAN, { connection: getRedisConnection(), defaultJobOptions });
  return draftScanQueue;
}
export function getFollowUpQueue(): Queue {
  if (!followUpQueue) followUpQueue = new Queue(QUEUE_FOLLOWUP, { connection: getRedisConnection(), defaultJobOptions });
  return followUpQueue;
}

/** Enqueue drafting for a set of threads (called after a sync ingests new inbound mail). */
export async function enqueueDrafts(threadIds: string[]): Promise<void> {
  if (!threadIds.length) return;
  const q = getDraftQueue();
  await q.addBulk(threadIds.map((threadId) => ({ name: "draft", data: { threadId }, opts: { jobId: `draft:${threadId}` } })));
}

/** Enqueue a sync for one mailbox now (used by the app's "Sync now" button to run it in the background). */
export async function enqueueMailboxSync(mailboxId: string): Promise<void> {
  await getSyncQueue().add("sync", { mailboxId }, { jobId: `sync:${mailboxId}:${Date.now()}` });
}

/**
 * Register the repeatable jobs (idempotent — BullMQ dedupes on the repeat key). Runs on worker boot:
 * scan all mailboxes every few minutes, scan follow-ups periodically.
 */
export async function registerRepeatableJobs(): Promise<void> {
  await getSyncQueue().add("scan-all", {}, { repeat: { every: 2 * 60_000 }, jobId: "sync-scan-all" });
  await getDraftScanQueue().add("scan", {}, { repeat: { every: 2 * 60_000 }, jobId: "draft-scan-all" });
  await getFollowUpQueue().add("scan", {}, { repeat: { every: 15 * 60_000 }, jobId: "follow-up-scan" });
}
