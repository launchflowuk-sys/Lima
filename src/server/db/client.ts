import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/env";
import * as schema from "./schema";

/**
 * Lazily-initialised Drizzle client. The postgres pool (and therefore env validation) is created on
 * FIRST query, not at import — so `next build` can import server modules without DATABASE_URL being
 * present. In dev the pool is stashed on globalThis to survive hot reloads.
 */
type DrizzleClient = ReturnType<typeof drizzle<typeof schema>>;
const globalForDb = globalThis as unknown as { __limaSql?: ReturnType<typeof postgres>; __limaDb?: DrizzleClient };

function init(): DrizzleClient {
  if (globalForDb.__limaDb) return globalForDb.__limaDb;
  const sql = globalForDb.__limaSql ?? postgres(env.DATABASE_URL, { max: 10 });
  if (env.NODE_ENV !== "production") globalForDb.__limaSql = sql;
  const client = drizzle(sql, { schema, casing: "snake_case" });
  if (env.NODE_ENV !== "production") globalForDb.__limaDb = client;
  return client;
}

export const db = new Proxy({} as DrizzleClient, {
  get: (_target, prop) => init()[prop as keyof DrizzleClient],
});

export type Db = DrizzleClient;
export { schema };
