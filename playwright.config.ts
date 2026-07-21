import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E config. Runs against a RUNNING app — it does not start one for you. Bring the app up
 * (`pnpm dev`) with a seeded owner, then `pnpm test:e2e`.
 *
 * Required env:
 *   E2E_BASE_URL       base URL of the running app (default http://localhost:3000)
 *   E2E_OWNER_EMAIL    seeded owner email    (only needed for the valid-login assertion)
 *   E2E_OWNER_PASSWORD seeded owner password (only needed for the valid-login assertion)
 *
 * The login spec skips its valid-credentials case when E2E_OWNER_* are absent, so the suite still
 * runs (redirect + invalid-creds + smoke) against any deployment without seeded creds.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
