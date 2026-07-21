import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/env";
import * as schema from "./schema";

/**
 * Lazily-initialised Drizzle client. The postgres pool (and therefore env validation) is created on
 * FIRST query, not at import — so `next build` can import server modules without DATABASE_URL being
 * present. The pool + client are memoised on globalThis as a true SINGLETON in EVERY environment
 * (dev: survives hot reloads; prod: one bounded pool per process). This is critical — without prod
 * memoisation the `db` Proxy would open a fresh postgres pool on every query and exhaust Postgres's
 * connection slots ("sorry, too many clients already").
 */
type DrizzleClient = ReturnType<typeof drizzle<typeof schema>>;
const globalForDb = globalThis as unknown as { __limaSql?: ReturnType<typeof postgres>; __limaDb?: DrizzleClient };

function init(): DrizzleClient {
  if (globalForDb.__limaDb) return globalForDb.__limaDb;
  const sql = globalForDb.__limaSql ?? postgres(env.DATABASE_URL, { max: 10 });
  globalForDb.__limaSql = sql;
  const client = drizzle(sql, { schema, casing: "snake_case" });
  globalForDb.__limaDb = client;
  return client;
}

export const db = new Proxy({} as DrizzleClient, {
  get: (_target, prop) => init()[prop as keyof DrizzleClient],
});

export type Db = DrizzleClient;
export { schema };
