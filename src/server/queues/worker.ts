import { logger } from "@/server/logger";
import { env } from "@/env";

/**
 * Background worker entrypoint (separate process from the web app — see docker-compose `worker`).
 * BullMQ queues (mailbox sync, classification, draft generation, sending, follow-ups, subscription
 * renewal…) are registered here in the automation phase. For now it boots, validates env, and
 * stays alive so the process/health wiring is real from day one.
 */
async function main() {
  getEnvGuard();
  logger.info("Lima worker started");
  // Queue processors are registered in later phases (see BUILD_PROGRESS.md).
  // Keep the process alive.
  await new Promise(() => {});
}

function getEnvGuard() {
  // Touch required infra vars so the worker fails fast if misconfigured.
  void env.DATABASE_URL;
  void env.REDIS_URL;
}

main().catch((err) => {
  logger.error({ err }, "Worker crashed");
  process.exit(1);
});
