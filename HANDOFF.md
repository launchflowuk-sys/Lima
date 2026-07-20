# Agent Lima — session handoff

**Read this first when starting a new Claude Code session in this repo.** It captures state that lives
outside the code (deploy, infra, decisions) so you can pick up cleanly.

## What this is
Agent Lima (`agentlima.com`) — a self-hosted, multi-business email agent: connects Gmail / Microsoft 365 /
**any IMAP-SMTP inbox**, classifies enquiries, drafts replies in each business's voice, and either queues
them for approval or auto-sends under strict rules. Next.js 16 + Drizzle/Postgres + Redis/BullMQ + OpenAI.
Also ships a native Expo app (`mobile/`) against the `/api/v1` JSON API. Full feature status: **BUILD_PROGRESS.md**.

## Repo + git
- GitHub (public): `github.com/launchflowuk-sys/Lima`, branch `main`.
- Commit as: `user.name="Shoji"`, `user.email="shujaat@nexusedu.co.uk"`. Deploy rule: build/verify locally, then push.
- Verify before pushing: `pnpm typecheck && pnpm test && pnpm build` (56 tests; all should pass).

## Deployment (as of this handoff)
- **LIVE:** `https://agentlima.com/login` serves **HTTP 200 over TLS**. Deployed as a **Coolify Docker
  Compose** resource (app name "Lima Agent", uuid `pagnac4lecxtmtnx5i2rvgk7`) from the public repo. All four
  containers (web, worker, postgres, redis) run; migrations execute on web startup.
- **Server:** Hetzner `167.233.211.252` (Ubuntu 26.04, 2 vCPU, 3.7 GB RAM + 4 GB swap).
- **SSH:** `ssh -i ~/.ssh/lima_hetzner root@167.233.211.252` (ed25519 deploy key on this PC; public key authorised on the box).
- **Coolify** 4.1.2 at `http://167.233.211.252:8000` (admin `launchflowuk@gmail.com`). Domain routing is via
  Coolify's `SERVICE_FQDN_WEB` magic var → Traefik rule `Host('agentlima.com')`; the `applications.fqdn`
  DB column is empty, which is normal for this mechanism (don't "fix" it).
- Coolify shows `running:unknown` because the web compose service has no `healthcheck:` — cosmetic; add one
  to the `web` service if you want `running:healthy`.
- A **raw** `docker compose` stack previously ran at `/opt/lima` (port 3000); **stopped** in favour of Coolify.
- **Coolify API — WORKS from Claude via a token file (do NOT paste tokens in chat):** the API token lives at
  `/root/.coolify_api_token` (chmod 600) on the server. Call the API over SSH referencing the file so the
  value never enters the transcript, e.g.
  `curl -H "Authorization: Bearer $(cat /root/.coolify_api_token)" http://localhost:8000/api/v1/...`.
  Deploy trigger + reads work this way (`POST /api/v1/deploy?uuid=pagnac4lecxtmtnx5i2rvgk7`). **Setting
  secret env vars via the API is still blocked** by Claude's credential classifier — add those (SESSION_SECRET,
  ENCRYPTION_KEY, passwords) in the Coolify **web UI**.

## Docker build gotchas (already fixed in the repo — keep them)
- Pin `pnpm@11.12.0` (`packageManager` field + `corepack prepare` in Dockerfile) — deterministic builds.
- Deps stage: `pnpm install --frozen-lockfile --config.strictDepBuilds=false` then
  `pnpm rebuild esbuild sharp @tailwindcss/oxide ...`. pnpm 11 hard-fails a fresh install on native build
  scripts even when allow-listed in `pnpm-workspace.yaml`; this is the reliable workaround.
- **Base images must be pullable at deploy time.** The original crash loop was `docker compose up` failing
  with `No such image: postgres:16 / redis:7` — the build succeeded but compose couldn't fetch the base
  images (its pull phase aborted on the build-only `web` service's benign "pull access denied"). Fix: the
  images just need to exist in the host's docker cache (`docker pull postgres:16 redis:7`). They're cached now.
- **Migrations run inside the web container's startup** (`command: sh -c "pnpm db:migrate && pnpm start"`),
  NOT a standalone `migrate` service — a one-shot service that exits 0 made Coolify read the whole resource
  as `exited:unhealthy`.
- **`DATABASE_URL` + `REDIS_URL` are wired in `docker-compose.yml`** (`environment:` on web+worker, derived
  from the `POSTGRES_*` vars), so they are NOT Coolify env vars. Don't be surprised they're absent from the
  Coolify env list — that's intentional (self-wiring stack; only true secrets live in the platform env).

## Env vars (see `.env.example` / `docs/RUNBOOK.md`)
Required to boot: `DATABASE_URL`, `REDIS_URL`, `APP_URL`, `SESSION_SECRET` (≥32 chars), `ENCRYPTION_KEY`
(base64 of 32 bytes). `OPENAI_API_KEY` is optional — without it everything works except AI classification/
drafting. In the compose deploy, `DATABASE_URL` points at the internal `postgres` service.

## Env vars actually configured (as of live deploy)
- **In Coolify env:** `APP_URL` (`https://agentlima.com`), `SESSION_SECRET`, `ENCRYPTION_KEY`, `OPENAI_API_KEY`,
  `POSTGRES_USER/PASSWORD/DB`, plus Coolify's `SERVICE_FQDN_WEB/URL_WEB`.
- **In compose (not Coolify):** `DATABASE_URL`, `REDIS_URL`.
- ⚠️ **`ENCRYPTION_KEY` must never change** now that it's set — it encrypts mailbox creds/tokens at rest.
- On Windows there is no `openssl`; generate secrets with PowerShell:
  `$b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)`
  (PS 5.1 has no `::Fill` — use `.Create().GetBytes()`; a failed `::Fill` silently leaves an all-zero `AAAA…` value).

## Pending / next steps
- [ ] **Seed the owner login** on the fresh DB (no user exists yet). In your own SSH session:
      `WEB=$(docker ps --format '{{.Names}}' | grep '^web-pagnac4'); docker exec -e SEED_OWNER_EMAIL='you@example.com' -e SEED_OWNER_PASSWORD='a-strong-pw' "$WEB" pnpm db:seed`
      — then sign in at `https://agentlima.com/login`. (Classifier blocks Claude from running this with a password.)
- [x] Coolify deploy of `agentlima.com` (TLS) — DONE, live.
- [x] `OPENAI_API_KEY` in Coolify — already set (AI drafting enabled).
- [ ] Optional: add a `healthcheck:` to the `web` compose service so Coolify reports `running:healthy`.
- [ ] **Gmail + Microsoft providers** (`src/server/email/providers/{gmail,microsoft}.ts`) are honest
      skeletons — implement OAuth/sync/send. Needs Shoji's Google Cloud OAuth + Pub/Sub and Entra app creds.
- [ ] **Mobile / EAS:** `EXPO_TOKEN` set as a user env var (account-scoped, all repos); Apple ASC API key +
      Google Play service-account JSON uploaded to EAS once. Then `cd mobile && eas init && eas build && eas submit`
      (confirm before any store submission). Set `expo.extra.apiUrl` to `https://agentlima.com`.
- [ ] Automated E2E (Playwright) + integration tests to complement the 56 unit tests.

## Tooling in a fresh session (IMPORTANT)
- **Global Claude skills + `~/.claude/CLAUDE.md` ARE available here** — they're user-scoped, so opening Claude
  Code in this folder loads them the same as anywhere on this machine.
- **Project auto-memory does NOT carry over.** The deploy notes were saved under the *bizzflowuk* project's
  memory, which a session opened in *this* folder won't see. That's why this HANDOFF.md exists — it's the
  source of truth for cross-session context in this repo. Update it as things change.
- The repo `CLAUDE.md` points here, so a new session is directed to read this file first.
