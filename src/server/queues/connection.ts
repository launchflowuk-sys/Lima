import IORedis from "ioredis";
import { env } from "@/env";

let connection: IORedis | null = null;

/**
 * Shared Redis connection for BullMQ. `maxRetriesPerRequest: null` is required by BullMQ's blocking
 * commands. Created lazily so importing queue modules during `next build` never opens a socket.
 */
export function getRedisConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
  }
  return connection;
}
