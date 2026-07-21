import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * DB-backed integration tests. These run against a REAL Postgres (TEST_DATABASE_URL) and are kept
 * OUT of the default `pnpm test` run — that stays fast, hermetic, and DB-free. Run these with
 * `pnpm test:integration` after `docker compose up -d postgres redis` and setting TEST_DATABASE_URL.
 *
 * When TEST_DATABASE_URL is unset the whole suite skips (see tests/integration/harness.ts →
 * describeIntegration) rather than failing, so it is safe to run in any environment.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    globalSetup: ["./tests/integration/global-setup.ts"],
    setupFiles: ["./tests/integration/setup.ts"],
    include: ["tests/integration/**/*.integration.test.ts"],
    // Real DB with shared tables — run files serially so per-test truncation can't race across files.
    fileParallelism: false,
    // bcrypt hashing + real IO is slower than the unit suite.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
