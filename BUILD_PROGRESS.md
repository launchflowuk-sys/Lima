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

Remaining in Phase 1 (next session):
- Auth: login / forgot / reset / accept-invitation, session cookies, middleware
- Server-side tenant-isolation guard used by every query + isolation tests
- shadcn/ui component set wired in
- Seed script: first organisation + owner user
- Vitest config + first isolation/rbac unit tests

## ⬜ Phase 2 — Gmail (OAuth, sync, Pub/Sub watch, send)
## ⬜ Phase 3 — Microsoft (OAuth, Graph subscriptions, delta, send)
## ⬜ Phase 3b — Generic IMAP/SMTP sync (poll loop, thread fetch) — send already works
## ⬜ Phase 4 — Unified inbox + conversation workspace
## ⬜ Phase 5 — AI (classification schema, entities, knowledge retrieval, draft, validation)
## ⬜ Phase 6 — Approval workflow + audit
## ⬜ Phase 7 — Rules engine + auto-send policy + follow-ups + escalations
## ⬜ Phase 8 — Analytics, system health, hardening, tenant-isolation + e2e tests

## Schema domains still to add (spec §10)
knowledge (+ documents/chunks/embeddings/templates), automation (rules/conditions/actions/
executions), follow-ups, contacts (+ profiles/notes/consents/interactions), data_retention_rules.

## Decisions
- Postgres + Drizzle, snake_case. UUID PKs (`gen_random_uuid`).
- Provider adapter pattern so "connect any inbox" (incl. generic IMAP/SMTP) is native.
- Secrets always encrypted at rest (AES-256-GCM); never in env for per-mailbox creds.
- New mailboxes default to `draft_only` autonomy.
