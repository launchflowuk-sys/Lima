# Build Progress — LaunchFlow Inbox Agent (Lima)

Living status doc. Update as each phase lands.

## ✅ Phase 1 — Foundation (in progress)

Done:
- Next.js 16 (App Router, TS strict) + Tailwind v4 scaffold
- Dependency set installed (Drizzle/Postgres, BullMQ/ioredis, jose/bcryptjs, googleapis, imapflow,
  nodemailer, mailparser, openai, pino, UI primitives)
- `src/env.ts` — Zod-validated env (fails fast on missing/invalid vars)
- `src/server/security/encryption.ts` — AES-256-GCM for tokens/passwords at rest
- `src/server/logger.ts` — pino
- Drizzle DB client + migrate runner + `drizzle.config.ts` (snake_case)
- **Schema (milestone-1 subset)**: organisations, businesses, users, user_business_access,
  sessions, invitations, mailboxes (+ sync_states, subscriptions, health_events),
  email_threads/messages/participants/attachments, thread_internal_notes,
  email_classifications, reply_drafts, reply_versions, ai_usage_records,
  audit_logs, security_events, blocked_senders, suppression_list. All business-scoped + indexed.
- **EmailProvider adapter**: interface (`providers/types.ts`) + Gmail / Microsoft / generic
  IMAP-SMTP implementations + registry. IMAP/SMTP `verifyConnection` + `sendReply` implemented;
  everything else is an honest skeleton (throws `ProviderNotImplementedError`, never fakes success).
- RBAC permission matrix (`server/auth/rbac.ts`)
- Worker entrypoint (`server/queues/worker.ts`)
- Docker (Dockerfile, docker-compose: postgres, redis, migrate, web, worker), `.env.example`
- Dashboard shell + nav + honest empty states

Also done:
- **Auth core**: bcrypt password hashing, DB-backed sessions (opaque token, only SHA-256 hash
  stored), `getCurrentUser`/`requireUser`, session cookie constant
- **Tenant-isolation guard** (`auth/access.ts`): AuthUser model + roleForBusiness /
  hasBusinessAccess / assertBusinessAccess / assertPermission / accessibleBusinessIds
- **Seed script** (`pnpm db:seed`) — first org + owner, idempotent
- **Vitest** + 17 passing tests: tenant isolation, RBAC matrix, AES-GCM round-trip/tamper,
  password hash, session token hashing

Also done:
- **Login flow works end to end**: `/login` page, `POST /api/auth/login` (verify → session cookie),
  `POST /api/auth/logout`, `proxy.ts` route guard (redirects cookieless requests), dashboard layout
  is now an auth-gated server component showing the signed-in user + sign-out.
- Lazy DB client (pool created on first query) so `next build` needs no live secrets.
- **Production build passes clean** (no warnings); `next build` verified.

Remaining in Phase 1 (next):
- forgot-password / reset-password / accept-invitation pages + handlers (need email sending)
- shadcn/ui component set wired in (login/dashboard currently use hand-rolled Tailwind)
- DB-backed integration test: seed → login → session → /dashboard

## How to run locally
`cp .env.example .env` → set `SESSION_SECRET`, `ENCRYPTION_KEY` (see README) →
`docker compose up -d postgres redis` → `pnpm db:migrate` → `SEED_OWNER_PASSWORD=... pnpm db:seed` →
`pnpm dev` → sign in at http://localhost:3000/login.

## ✅ Businesses + "connect any inbox" (IMAP/SMTP) — done
- Route group `(app)` = shared auth-gated shell for all top-level pages (/dashboard, /businesses, /mailboxes…)
- **Businesses**: tenant-scoped list + owner create-business (server action, audited)
- **Mailboxes**: tenant-scoped list + **Connect IMAP/SMTP inbox** flow — encrypts IMAP+SMTP passwords,
  live-verifies via the provider (SMTP verify), records status + health event + audit; delete mailbox.
  This is the headline "add any inbox" feature working end to end (no cloud creds needed).
- Services: `businesses/service.ts`, `mailboxes/service.ts`, `audit/log.ts` — all business-scoped.

## ⬜ Phase 2 — Gmail (OAuth, sync, Pub/Sub watch, send) — NEEDS Google Cloud client id/secret + Pub/Sub
## ⬜ Phase 3 — Microsoft (OAuth, Graph subscriptions, delta, send) — NEEDS Entra app registration
## ✅ Phase 3b — IMAP ingestion (built; verify against a real mailbox)
- `email/sync/imap-sync.ts`: connects (imapflow), fetches new UIDs since the stored cursor
  (uidValidity:lastUid; first run = last 50), parses (mailparser), stores threads/messages/
  participants/attachment-metadata, dedupes by (mailbox, provider message id), advances cursor,
  blocks executable attachments. "Sync now" button on Mailboxes triggers it.
- NOTE: needs a live IMAP mailbox to verify end to end (Shoji has real ones to test with).

## 🟡 Phase 4 — Unified inbox + thread view (read side done)
- `/inbox` unified thread list (tenant-scoped, unread markers, status badges)
- `/inbox/[threadId]` chronological thread view; opening marks read
- TODO: filters/search, assignment, notes, the intelligence panel + reply editor (AI/approval phases)
## 🟡 Phase 5 — AI classification core done (needs OPENAI_API_KEY to run live)
- Zod `ClassificationSchema` derived from the DB enums (can't drift); structured output per spec §11
- `AiProvider` adapter interface + `OpenAiProvider` (JSON mode → schema-validated)
- Prompt with system/data separation + explicit prompt-injection defence (spec §22)
- **Auto-send safety policy** (`safety.ts`, spec §16): pure `evaluateAutoSend` — blocks complaints/
  refunds/payments/contracts, high/prohibited risk, angry/threatening, low confidence, escalations;
  can only ever *reduce* the model's autoSendEligible, never grant it
- `classifyThread` applies the policy over the model's output
- 10 new tests (safety matrix, schema validation, policy-over-model) — 27 total, all passing
- TODO next: knowledge retrieval to feed businessContext, reply-draft generation, persistence to
  email_classifications + ai_usage_records (wired once ingestion produces messages)

## 🟡 Phase 5b — Reply draft generation (built; needs OPENAI_API_KEY to run)
- `AiProvider.generateReply` + OpenAI impl + reply prompt encoding the spec §14 rules (preserve
  names/dates/prices, only approved facts, ask only missing info, business tone/signature, no AI tells)
- `drafts/service.generateDraftForThread`: classify → draft → persist classification + reply_draft
  (with the auto-send decision + reason from safety) + ai_usage; "Generate AI draft" button on a thread
- reply-generation covered by the fake-provider test

## ✅ Phase 6 — Approval workflow + send (send works today via IMAP provider)
- `/approvals`: pending drafts, inline edit, **Approve & send** (sends through the thread's mailbox
  provider — real for IMAP/SMTP), Reject. Edits stored as immutable reply_versions.
- Sent reply is written back as an outbound message; thread → waiting_customer; every step audited.
- The whole spine now runs: receive (IMAP) → read → classify+draft (AI) → approve → send.
## ✅ Phase 6b — Knowledge base + retrieval (built; runs now, no API key needed)
- **Schema**: `business_knowledge_entries` (approved facts, kind/priority/tags/active), `knowledge_documents`
  (pasted docs → chunked), `knowledge_chunks` (one retrieval table for both entries & docs, optional
  jsonb `embedding` so no pgvector needed), `email_templates`. Migration `0001_elite_junta.sql`.
- **Retrieval** (`knowledge/retrieval.ts`, pure + 14 tests): tokenise → keyword overlap score, plus
  cosine similarity when embeddings exist; small capped priority bonus so core facts are never starved
  but can't outrank a direct match; `assembleContext` builds a char-budgeted context + records used ids.
- **Service** (`knowledge/service.ts`): entry CRUD, paste-document + `chunkText`, best-effort embedding
  on write (degrades to keyword if no OPENAI_API_KEY), `retrieveBusinessContext(businessId, query)` —
  loads ONLY that business's chunks (tenant isolation), skips inactive entries.
- **Wired into drafting**: `generateDraftForThread` now retrieves real business context from the query
  (subject + latest inbound) instead of an empty string, and records `knowledgeUsed` chunk ids on the draft.
- **UI**: `/knowledge` page — approved-facts table, documents table, add-fact + paste-document forms
  (per-business selector), delete. Removes one of the 404 nav links.
- **API**: `GET/POST /api/v1/knowledge` for the mobile app.
- Optional `embedText` added to the `AiProvider` interface + OpenAI impl (text-embedding-3-small).

## ✅ Phase 7 — Automation rules engine + controlled auto-send (Mode 2)
- **Schema**: `automation_rules` (per-business, priority-ordered, typed JSONB conditions + actions,
  stop_on_match), `automation_executions` (which rules matched + outcome, for "why did this happen?").
  Added a `tags` jsonb column to `email_threads`. Migration `0002_soft_ulik.sql`.
- **Pure engine** (`automation/engine.ts`, 21 tests): `ruleMatches` (AND semantics over intents/urgency/
  sentiment/maxRisk/from·subject·body substrings, case-insensitive) + `evaluateRules` (priority order,
  hold/escalate are sticky and beat auto-send, tag union, stop-on-match).
- **Service**: rule CRUD (requires `automation.configure`) + `applyAutomationForThread` — applies thread
  effects (tags, assignment, escalate→status) and records an execution row; returns the decision.
- **Auto-send (Mode 2)**: refactored `approvals/service` to one `deliverDraft` send path shared by human
  approve and the new **`autoSendDraft`** (system actor, no user). `generateDraftForThread` now runs the
  rules, then auto-sends ONLY when: safety policy eligible (§16) AND a rule allowed it AND the mailbox is
  in `controlled_auto_send`. On provider failure it falls back to a human draft. Everything audited.
- **UI**: `/automation` page (rules table with when/then summary, enable/disable, delete) + create-rule
  form; **mailbox autonomy switcher** on `/mailboxes` (draft-only ⇄ controlled auto-send, needs
  `ai.configure`). Kills another 404.
- **API**: `GET /api/v1/automation`.

## ✅ Phase 7b — Contacts (customer memory) + follow-ups
- **Schema**: `contacts` (per business, unique on (business,email), messageCount/notes/tags/first·lastSeen),
  `follow_ups` (dueAt/reason/status, thread + contact links). Migration `0003_ambiguous_manta.sql`.
- **Contacts service**: `upsertContactFromInbound` — atomic onConflict upsert (bumps count, advances
  lastSeen, fills name only if empty), called from IMAP ingest for every inbound sender. `getContactContext`
  feeds prior-contact + human notes into the reply prompt (wired into `generateDraftForThread`). Notes edit.
- **Follow-ups service**: create/list-pending/complete/cancel (requires `conversation.note`).
- **UI**: `/contacts` (table + inline notes editor) and `/follow-ups` (pending list with overdue highlight,
  Done/Cancel, schedule form). Kills two more 404 nav links.
- **API**: `GET /api/v1/contacts`, `GET/POST /api/v1/follow-ups`.
- NOTE: a background job to *notify* on due follow-ups lands with the notifications phase; data + UI are here.

## ✅ Phase 8a — Dashboard + analytics + settings + team (all nav 404s gone)
- Real `getDashboardStats` + `getAnalytics` (tenant-scoped counts, intent/sentiment, auto-send rate,
  AI cost). `/dashboard`, `/analytics`, `/settings` (tone+signature), `/team` (members + access grant +
  invites), `/accept-invitation` (public accept→session). `GET /api/v1/analytics|contacts|follow-ups`.

## ✅ Phase 8b — BullMQ background queues (autonomous pipeline)
- `queues/connection.ts` (lazy ioredis), `queues/queues.ts` (mailbox-sync/draft-generation/follow-up-scan
  queues + enqueue helpers + repeatable jobs), `queues/processors.ts`, rewritten `queues/worker.ts`
  (real Workers + graceful shutdown).
- Flow: repeatable **scan-all** every 2m → fans out a **sync** per connected IMAP mailbox → `syncImapMailbox`
  now returns new inbound thread ids → **enqueueDrafts** → **draft** job runs `generateDraftForThreadSystem`
  (guards: OPENAI set, thread still needs_reply, no pending draft) → automation + controlled auto-send fire
  downstream. Follow-up scan every 15m (delivery lands with notifications).
- `generateDraftForThread` refactored into a shared core + a system (no-user) entrypoint for the worker.
- NOTE: needs REDIS_URL + a running `pnpm worker` (docker-compose `worker`) + a connected IMAP mailbox to
  exercise end to end. App build unaffected (queues aren't imported by the web bundle).

## ⬜ Phase 8c — Notifications (in-app + email/SMS/push adapters) wired to follow-ups/escalations/approvals
## ⬜ Phase 9 — Gmail + Microsoft OAuth/sync (code-complete; Shoji supplies creds) + E2E/integration tests
## ⬜ Phase 8 — Analytics, system health, hardening, tenant-isolation + e2e tests

## ✅ Mobile-ready JSON API (`/api/v1`) — built
The product ships as a **web dashboard + native iOS/Android app (Expo → EAS)**. Native clients can't
use Next server actions, so all logic lives in the services layer and is exposed over a versioned
JSON API with **Bearer-token auth** (same opaque-token session model as the web cookie):
- `getUserFromRequest` (Bearer) + `loadAuthUser` shared with the web path; `withApiUser` wrapper
- Endpoints: `POST /api/v1/auth/login` (→ token+user), `GET /auth/me`, `GET /inbox`,
  `GET /threads/[id]`, `GET /approvals`, `POST /drafts/[id]/approve`, `POST /drafts/[id]/reject`
- Native fetch isn't subject to CORS, so no CORS layer needed for the app.

## 🟡 Mobile app (Expo) — scaffolded (typecheck clean; needs `npm install` + Expo Go to run)
- `mobile/` — Expo Router + TS (SDK 57). Screens: `login`, `(app)/inbox`, `(app)/approvals` (approve/
  reject inline), `thread/[id]`. `lib/api.ts` typed client → `/api/v1`; `lib/token.ts` secure store
  (Keychain/Keystore); `lib/auth.tsx` context. `app.json` (bundle id com.launchflow.inbox), `eas.json`
  build profiles. Isolated deps (own node_modules) so no clash with the web app's React.
- NOTE: create-expo-app's template extractor is broken in this sandbox, so it was hand-assembled via
  `npm install expo` + `expo install` (correct SDK-57 versions) — verified with `tsc --noEmit`.
- TODO: `npm install` in `mobile/`, set `expo.extra.apiUrl` to the API, `npx expo start` (Expo Go).
- Then EAS: `eas init` → `eas build`/`eas submit` to TestFlight + Play (needs Apple/Google creds).
- Push notifications for approval alerts: not wired yet (after first build).

## Schema domains still to add (spec §10)
knowledge (+ documents/chunks/embeddings/templates), automation (rules/conditions/actions/
executions), follow-ups, contacts (+ profiles/notes/consents/interactions), data_retention_rules.

## Decisions
- Postgres + Drizzle, snake_case. UUID PKs (`gen_random_uuid`).
- Provider adapter pattern so "connect any inbox" (incl. generic IMAP/SMTP) is native.
- Secrets always encrypted at rest (AES-256-GCM); never in env for per-mailbox creds.
- New mailboxes default to `draft_only` autonomy.
