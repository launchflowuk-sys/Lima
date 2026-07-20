import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/env";
import * as schema from "./schema";

/**
 * Single shared postgres.js connection pool + Drizzle client. In dev we stash it on globalThis so
 * Next's hot reload doesn't open a new pool on every change (a classic connection-leak footgun).
 */
const globalForDb = globalThis as unknown as { __limaSql?: ReturnType<typeof postgres> };

const sql = globalForDb.__limaSql ?? postgres(env.DATABASE_URL, { max: 10 });
if (env.NODE_ENV !== "production") globalForDb.__limaSql = sql;

export const db = drizzle(sql, { schema, casing: "snake_case" });
export type Db = typeof db;
export { schema };
