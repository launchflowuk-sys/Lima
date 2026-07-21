# Testing

Three layers, three commands. Only the first needs no infrastructure.

| Layer | Command | Needs |
|-------|---------|-------|
| Unit (pure, hermetic) | `pnpm test` | nothing |
| Integration (real Postgres) | `pnpm test:integration` | Postgres + `TEST_DATABASE_URL` |
| E2E (Playwright) | `pnpm test:e2e` | a running app + seeded owner |

## 1. Unit tests — `pnpm test`

The default suite. Pure functions and logic only; **no database, no network**. `vitest.setup.ts` feeds
dummy-but-valid env so `@/env` validation passes. This must stay fast and green with zero infra — it is
the pre-push gate (`pnpm typecheck && pnpm test && pnpm build`).

## 2. Integration tests — `pnpm test:integration`

DB-backed tests that exercise the critical spine (auth/session, tenant isolation, mailbox connect,
draft→approve→send) through the **real service layer against a real Postgres**. Only genuinely external
I/O is mocked (SMTP/IMAP verify + send, OpenAI). They live in `tests/integration/*.integration.test.ts`
and run under a **separate** Vitest config (`vitest.integration.config.ts`) so they never run in
`pnpm test`.

Gated on `TEST_DATABASE_URL`: **if it is unset the whole suite skips** (with a clear message) rather than
failing — so `pnpm test:integration` is safe to run anywhere.

### Run them

```bash
docker compose up -d postgres redis          # starts Postgres (and Redis)

# One-time: create a DEDICATED test database (never the dev DB). With the docker-compose Postgres:
docker compose exec -T postgres psql -U lima -d lima -c "CREATE DATABASE lima_test;"

# Point the tests at it and run. User/pass/host match your docker-compose Postgres.
export TEST_DATABASE_URL="postgres://lima:<password>@localhost:5432/lima_test"
pnpm test:integration
```

On Windows PowerShell:

```powershell
$env:TEST_DATABASE_URL = "postgres://lima:<password>@localhost:5432/lima_test"
pnpm test:integration
```

Migrations are applied automatically to `TEST_DATABASE_URL` before the suite (Vitest `globalSetup`), and
every table is truncated between tests for isolation. `TEST_DATABASE_URL` can also be put in `.env`
(gitignored) instead of exporting it.

> Use a dedicated database (e.g. `lima_test`). The suite TRUNCATEs every table between tests — never
> point `TEST_DATABASE_URL` at a database with data you care about.

## 3. E2E tests — `pnpm test:e2e`

Playwright specs in `e2e/` drive a **running** app (they do not start one). Covers the login flow
(protected-route redirect, brand badge, invalid creds error, valid creds → `/dashboard`) plus a smoke
check.

### One-time

```bash
pnpm test:e2e:install        # installs the Chromium browser (playwright install --with-deps chromium)
```

### Run them

```bash
# 1. Bring the app up with a seeded owner (see docs/RUNBOOK.md):
docker compose up -d postgres redis
pnpm db:migrate
SEED_OWNER_EMAIL=you@example.com SEED_OWNER_PASSWORD='a-strong-password' pnpm db:seed
pnpm dev                                    # http://localhost:3000

# 2. In another terminal, point Playwright at it and run:
export E2E_BASE_URL="http://localhost:3000"
export E2E_OWNER_EMAIL="you@example.com"        # only needed for the valid-login case
export E2E_OWNER_PASSWORD="a-strong-password"   # only needed for the valid-login case
pnpm test:e2e
```

`E2E_BASE_URL` defaults to `http://localhost:3000`. The **valid-login** test skips automatically when
`E2E_OWNER_EMAIL` / `E2E_OWNER_PASSWORD` are absent, so the redirect + invalid-creds + smoke checks run
against any deployment (including `https://agentlima.com`) without seeded creds. List specs without
running them with `pnpm test:e2e -- --list`.

## Env summary (no secrets committed)

| Var | Used by | Notes |
|-----|---------|-------|
| `TEST_DATABASE_URL` | integration | Postgres URL for a **dedicated** test DB. Suite skips if unset. |
| `E2E_BASE_URL` | e2e | Running app URL. Default `http://localhost:3000`. |
| `E2E_OWNER_EMAIL` / `E2E_OWNER_PASSWORD` | e2e | Seeded owner creds; only the valid-login case needs them. |
