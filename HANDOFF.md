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
- **Server:** Hetzner `167.233.211.252` (Ubuntu 26.04, 2 vCPU, 3.7 GB RAM + 4 GB swap).
- **SSH:** `ssh -i ~/.ssh/lima_hetzner root@167.233.211.252` (ed25519 deploy key on this PC; public key authorised on the box).
- **Coolify** 4.1.2 installed at `http://167.233.211.252:8000` (admin `launchflowuk@gmail.com`). Domain
  `agentlima.com` → the server (A record). Lima is being set up as a **Coolify Docker Compose** resource
  from the public repo, with `agentlima.com` + Let's Encrypt TLS.
- A **raw** `docker compose` stack previously ran at `/opt/lima` (port 3000); it was **stopped** in favour of
  the Coolify-managed deploy. If Coolify isn't up yet, `/opt/lima/deploy.sh` (build→migrate→up) can bring the
  raw stack back for testing.
- **Coolify API note:** driving Coolify's API from Claude's sandbox is blocked by a credential classifier —
  do Coolify resource creation via its **web UI** (or have Shoji paste API calls in his own terminal).

## Docker build gotchas (already fixed in the repo — keep them)
- Pin `pnpm@11.12.0` (`packageManager` field + `corepack prepare` in Dockerfile) — deterministic builds.
- Deps stage: `pnpm install --frozen-lockfile --config.strictDepBuilds=false` then
  `pnpm rebuild esbuild sharp @tailwindcss/oxide ...`. pnpm 11 hard-fails a fresh install on native build
  scripts even when allow-listed in `pnpm-workspace.yaml`; this is the reliable workaround.
- `docker-compose.yml` `migrate` service needs full `env_file: .env` — `src/env.ts` validates the whole
  schema on first access, so `DATABASE_URL` alone isn't enough.

## Env vars (see `.env.example` / `docs/RUNBOOK.md`)
Required to boot: `DATABASE_URL`, `REDIS_URL`, `APP_URL`, `SESSION_SECRET` (≥32 chars), `ENCRYPTION_KEY`
(base64 of 32 bytes). `OPENAI_API_KEY` is optional — without it everything works except AI classification/
drafting. In the compose deploy, `DATABASE_URL` points at the internal `postgres` service.

## Pending / next steps
- [ ] Finish the Coolify deploy of `agentlima.com` (TLS), then **re-seed the owner** on the fresh DB:
      `docker exec -e SEED_OWNER_EMAIL=... -e SEED_OWNER_PASSWORD=... <web-container> pnpm db:seed`.
- [ ] Add `OPENAI_API_KEY` in Coolify env to switch on AI drafting; redeploy.
- [ ] Rotate the temporary seeded owner password (it was shown in chat during first deploy).
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
