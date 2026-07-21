import { beforeEach, afterAll } from "vitest";
import { resetDatabase, closeTestDb } from "./harness";

/**
 * Per-worker setup for integration tests (runs in every test process, before the app modules load).
 *
 * Points the app's DB client at TEST_DATABASE_URL by setting DATABASE_URL BEFORE `@/env` is first
 * read (env is lazily validated + cached, and the db client is lazily initialised, so this wins). The
 * other vars just satisfy env validation — no real infra behind them is touched by these tests
 * (external providers are mocked). ENCRYPTION_KEY must be a valid base64 32-byte key so the real
 * encrypt/decrypt path works.
 */
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
// Fallback so `@/env` validation never crashes even when the suite is fully skipped (no TEST_DATABASE_URL).
process.env.DATABASE_URL ??= "postgres://user:pass@localhost:5432/lima_test";
process.env.REDIS_URL ??= "redis://localhost:6379";
process.env.APP_URL ??= "http://localhost:3000";
process.env.SESSION_SECRET ??= "test-session-secret-at-least-32-characters-long";
process.env.ENCRYPTION_KEY ??= Buffer.from("0123456789abcdef0123456789abcdef").toString("base64");

// Reset to a clean schema before every test so each test is fully isolated.
beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await closeTestDb();
});
