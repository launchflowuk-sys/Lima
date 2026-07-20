import { and, eq, lte } from "drizzle-orm";
import { db } from "@/server/db/client";
import { mailboxes, emailThreads, replyDrafts, followUps } from "@/server/db/schema";
import { env } from "@/env";
import { logger } from "@/server/logger";
import { syncImapMailbox } from "@/server/email/sync/imap-sync";
import { generateDraftForThreadSystem } from "@/server/drafts/service";
import { enqueueDrafts, getSyncQueue, type SyncJob, type DraftJob } from "./queues";

/**
 * Sync processor. With a mailboxId: pull that mailbox and enqueue drafting for any threads that got new
 * inbound mail. Without one (the periodic scan): fan out a sync job for every connected IMAP mailbox.
 */
export async function processSyncJob(data: SyncJob): Promise<void> {
  if (!data.mailboxId) {
    const connected = await db
      .select({ id: mailboxes.id })
      .from(mailboxes)
      .where(and(eq(mailboxes.provider, "imap_smtp"), eq(mailboxes.status, "connected")));
    const q = getSyncQueue();
    for (const m of connected) {
      await q.add("sync", { mailboxId: m.id }, { jobId: `sync:${m.id}:${Date.now()}` });
    }
    logger.info({ count: connected.length }, "queue: fanned out mailbox syncs");
    return;
  }

  const [mailbox] = await db.select().from(mailboxes).where(eq(mailboxes.id, data.mailboxId)).limit(1);
  if (!mailbox) return;
  if (mailbox.provider !== "imap_smtp") return; // Gmail/Microsoft get their own sync in their phases.

  const { ingested, inboundThreadIds } = await syncImapMailbox(mailbox);
  logger.info({ mailboxId: mailbox.id, ingested, newThreads: inboundThreadIds.length }, "queue: mailbox synced");
  await enqueueDrafts(inboundThreadIds);
}

/**
 * Draft processor. Drafts (and possibly auto-sends, downstream) a reply for one thread. Skips silently
 * if no AI is configured or the thread already has a pending draft, so re-runs are safe.
 */
export async function processDraftJob(data: DraftJob): Promise<void> {
  if (!env.OPENAI_API_KEY) {
    logger.warn({ threadId: data.threadId }, "queue: OPENAI_API_KEY not set, skipping draft generation");
    return;
  }
  const [thread] = await db.select().from(emailThreads).where(eq(emailThreads.id, data.threadId)).limit(1);
  if (!thread) return;
  // Only auto-draft threads still awaiting a first reply, and never double-draft.
  if (thread.status !== "needs_reply") return;
  const [pending] = await db
    .select({ id: replyDrafts.id })
    .from(replyDrafts)
    .where(and(eq(replyDrafts.threadId, data.threadId), eq(replyDrafts.status, "pending_approval")))
    .limit(1);
  if (pending) return;

  await generateDraftForThreadSystem(data.threadId);
  logger.info({ threadId: data.threadId }, "queue: draft generated");
}

/**
 * Follow-up scan. Finds pending follow-ups now due. Delivery (in-app/email/push notification) is wired
 * in the notifications phase; for now it surfaces the count so the pipeline is observable.
 */
export async function processFollowUpScan(): Promise<void> {
  const due = await db
    .select({ id: followUps.id })
    .from(followUps)
    .where(and(eq(followUps.status, "pending"), lte(followUps.dueAt, new Date())));
  if (due.length) logger.info({ due: due.length }, "queue: follow-ups due (notification delivery pending)");
}
