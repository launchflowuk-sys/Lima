import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/**
 * Vitest global setup for the integration suite. Runs ONCE before any test file, in the main process
 * (env changes here do NOT propagate to test workers — those set their own env in setup.ts).
 *
 * Applies the Drizzle migrations to TEST_DATABASE_URL so the schema exists. Reads the URL straight
 * from process.env (not the validated `env` proxy) so it doesn't require the full app env to be set.
 * If TEST_DATABASE_URL is unset it no-ops — the tests themselves skip via describeIntegration.
 */
export default async function setup(): Promise<void> {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    console.warn(
      "\n[integration] TEST_DATABASE_URL is not set — skipping migrations and all integration tests.\n" +
        "  Bring up a DB (docker compose up -d postgres redis), create a test database (e.g. lima_test),\n" +
        "  then set TEST_DATABASE_URL=postgres://user:pass@localhost:5432/lima_test and re-run.\n",
    );
    return;
  }

  const sql = postgres(url, { max: 1 });
  try {
    const db = drizzle(sql);
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("[integration] migrations applied to test database");
  } finally {
    await sql.end();
  }
}
