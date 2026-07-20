// Provide valid env for modules that validate it (env.ts) during unit tests. Dummy but well-formed
// values — no real infra is touched by the pure unit tests.
// NODE_ENV is set to "test" by vitest automatically.
process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/lima_test";
process.env.REDIS_URL = "redis://localhost:6379";
process.env.APP_URL = "http://localhost:3000";
process.env.SESSION_SECRET = "test-session-secret-at-least-32-characters-long";
// A valid base64-encoded 32-byte key for the encryption tests.
process.env.ENCRYPTION_KEY = Buffer.from("0123456789abcdef0123456789abcdef").toString("base64");
