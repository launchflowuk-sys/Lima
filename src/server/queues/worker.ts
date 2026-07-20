import { Worker } from "bullmq";
import { logger } from "@/server/logger";
import { env } from "@/env";
import { getRedisConnection } from "./connection";
import { QUEUE_SYNC, QUEUE_DRAFT, QUEUE_FOLLOWUP, registerRepeatableJobs, type SyncJob, type DraftJob } from "./queues";
import { processSyncJob, processDraftJob, processFollowUpScan } from "./processors";

/**
 * Background worker entrypoint (separate process from the web app — see docker-compose `worker`).
 * Runs the BullMQ workers that make Lima autonomous: periodic mailbox sync → draft generation
 * (→ controlled auto-send downstream) → follow-up scanning. Each worker retries with backoff per the
 * queue's defaultJobOptions.
 */
async function main() {
  void env.DATABASE_URL; // fail fast if core infra vars are missing
  const connection = getRedisConnection();

  const workers: Worker[] = [
    new Worker<SyncJob>(QUEUE_SYNC, (job) => processSyncJob(job.data), { connection, concurrency: 3 }),
    new Worker<DraftJob>(QUEUE_DRAFT, (job) => processDraftJob(job.data), { connection, concurrency: 2 }),
    new Worker(QUEUE_FOLLOWUP, () => processFollowUpScan(), { connection, concurrency: 1 }),
  ];

  for (const w of workers) {
    w.on("failed", (job, err) => logger.error({ queue: w.name, jobId: job?.id, err }, "job failed"));
    w.on("error", (err) => logger.error({ queue: w.name, err }, "worker error"));
  }

  await registerRepeatableJobs();
  logger.info("Lima worker started (sync, draft, follow-up)");

  const shutdown = async () => {
    logger.info("Worker shutting down…");
    await Promise.all(workers.map((w) => w.close()));
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  logger.error({ err }, "Worker crashed");
  process.exit(1);
});
