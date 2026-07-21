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

## Mobile (Expo / EAS) — WIRED, first builds triggered (2026-07)
The native app in `mobile/` (Expo SDK 57 + Expo Router) is fully connected to EAS and both store
credential paths are validated by real builds.
- **EAS project:** `@shoji147/launchflow-inbox`, projectId `d341b11d-6ae8-43f5-870f-27a2ffc17ca6`,
  owner `shoji147`. Display name **Agent Lima**, bundle/package `com.launchflow.inbox`.
  `expo.extra.apiUrl = https://agentlima.com`. `eas init` already run.
- **Auth:** `EXPO_TOKEN` is a **User** env var on this PC → `eas` runs non-interactively. `eas whoami` = `shoji147`.
- **Credentials live LOCALLY, git-ignored** in `mobile/credentials/` (NEVER commit; `.gitignore` blocks
  `*.p8`/`*.p12`/`*-service-account.json`/`credentials/`):
  - iOS: `AuthKey_2J2YAD9YTJ.p8` (App Store Connect API key). Key ID `2J2YAD9YTJ`, Issuer
    `252f4cf6-a5b5-4d27-bba5-1cdb31a4db1a`, Team `64GY32R9Y2` (LaunchFlow UK Ltd, COMPANY_OR_ORGANIZATION).
  - Android: `play-service-account.json` (SA `lima-eas-publisher@agen-lima-eas-builder.iam.gserviceaccount.com`,
    invited into Play Console as Admin; Google Play Android Developer API enabled).
  - Both wired in `mobile/eas.json` (`submit.production.ios` / `.android`, track `internal`).
- **iOS build creds gotchas (keep):** first iOS build needs `EXPO_ASC_API_KEY_PATH` + `EXPO_ASC_KEY_ID` +
  `EXPO_ASC_ISSUER_ID` + `EXPO_APPLE_TEAM_ID` + `EXPO_APPLE_TEAM_TYPE=COMPANY_OR_ORGANIZATION` in the shell so
  EAS auto-creates the cert non-interactively. The distribution cert (`AD9DPR7PC3`) is now created on Expo's
  servers and **reused** across Shoji's apps → future iOS builds run non-interactive with no env vars needed.
  `EXPO_NO_CAPABILITY_SYNC=1` is persisted as a **User** env var (Apple capability-sync patch errors otherwise,
  because Push is enabled on the App ID but not declared in the app yet).
- **App records exist:** App Store Connect app (Agent Lima / com.launchflow.inbox) created; Play Console app
  "Agent Lima" created. Apple App ID has Push capability enabled (fine; unused until push is wired).
- **First builds:** Android `31caecb6-…` + iOS `ac95b265-…` triggered `--no-wait` (production profile).
  Check: `cd mobile && eas build:list`.
- **NOT yet done / next on mobile:** (1) confirm the two builds went green; (2) `eas submit` iOS→TestFlight
  and Android→Play internal — **Google requires the FIRST `.aab` uploaded via the Play Console UI once** for a
  brand-new app, then API submits work. **Always confirm with Shoji before any store submission.** (3) Wire
  push notifications (expo-notifications) for approval alerts — then enable Push in app.json + re-enable capability sync.

## Pending / next steps
- [ ] **NEXT CODE WORK (no external creds needed): E2E (Playwright) + DB-backed integration tests.**
      None exist yet — current 56 tests are all pure unit tests (`src/**/*.test.ts`). Target the critical
      spine: login → connect IMAP mailbox → sync → inbox → generate AI draft → approve & send. Add a
      seed→login→session→/dashboard integration test. Stand up Postgres/Redis (docker compose) for the run.
      Recommend doing this in a fresh session (this one is long).
- [ ] **Seed the owner login** on the live DB (no user exists yet). In your own SSH session:
      `WEB=$(docker ps --format '{{.Names}}' | grep '^web-pagnac4'); docker exec -e SEED_OWNER_EMAIL='you@example.com' -e SEED_OWNER_PASSWORD='a-strong-pw' "$WEB" pnpm db:seed`
      — then sign in at `https://agentlima.com/login`. (Classifier blocks Claude from running this with a password.)
- [x] **Gmail provider — BUILT (real Gmail API, no mocks).** OAuth start/callback routes
      (`/api/oauth/gmail/{start,callback}`), signed state (jose), encrypted token storage + auto-refresh,
      `historyId` incremental sync into the existing thread tables, MIME reply send with correct
      threading, "Connect Gmail" button on /mailboxes. Typecheck + 70 tests + build all green.
      **Needs Shoji's Google Cloud OAuth creds to verify live** — full setup steps in `docs/GMAIL_SETUP.md`;
      set `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GOOGLE_REDIRECT_URI` in Coolify. Pub/Sub push is
      optional (Phase 2b) — polling works without it.
- [ ] **Microsoft provider** (`src/server/email/providers/microsoft.ts`) is still an honest skeleton —
      implement OAuth/sync/send. Needs an Entra app registration. (Gmail is the template to follow now.)
- [ ] Finish mobile store submission (see Mobile section above) once builds are green.
- [ ] Optional: add a `healthcheck:` to the `web` compose service so Coolify reports `running:healthy`.
- [x] Coolify deploy of `agentlima.com` (TLS) — DONE, live.
- [x] `OPENAI_API_KEY` in Coolify — set (AI drafting enabled).
- [x] Mobile: EAS linked + iOS/Android credentials wired + first builds triggered.
- [x] Notifications (Phase 8c) — actually built (in-app + email channels wired into the queue). BUILD_PROGRESS marker was stale.
- [x] **Branding — DONE.** Logo processed into a full asset set (`sharp`): app icon on a black→deep-blue
      gradient, Android adaptive icon, mobile splash (`#05070C`), web favicon/apple-icon (`src/app/icon.png`,
      `apple-icon.png` — old default `favicon.ico` removed), and a rounded badge in the web sidebar + login.
      Mobile assets in `mobile/assets/images/`, brand source in `public/brand/`. Wired in `mobile/app.json`.
      Regenerate script (if the logo changes): scratchpad `imgtool/build.js` (needs `sharp`).

## Tooling in a fresh session (IMPORTANT)
- **Global Claude skills + `~/.claude/CLAUDE.md` ARE available here** — they're user-scoped, so opening Claude
  Code in this folder loads them the same as anywhere on this machine.
- **Project auto-memory does NOT carry over.** The deploy notes were saved under the *bizzflowuk* project's
  memory, which a session opened in *this* folder won't see. That's why this HANDOFF.md exists — it's the
  source of truth for cross-session context in this repo. Update it as things change.
- The repo `CLAUDE.md` points here, so a new session is directed to read this file first.
