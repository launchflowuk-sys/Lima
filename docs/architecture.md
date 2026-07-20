# Architecture — LaunchFlow Inbox Agent

## Purpose
Multi-business email monitoring + reply agent. Connects many inboxes (Gmail, Microsoft 365, and any
IMAP/SMTP mailbox), understands threads, classifies enquiries, drafts replies in the correct business
voice, and either queues them for approval or auto-sends under strict pre-approved rules.

## Tenancy model
- `organisations` → many `businesses`. **`business` is the tenant boundary.**
- Almost every table carries `business_id` and is indexed on it. Data from one business is never used
  when acting for another (hard requirement).
- `users` are org-global; per-business access is granted via `user_business_access` (role per
  business). Org `owners` bypass grants. All permission checks run server-side (`server/auth/rbac.ts`).

## Layers
- `src/app` — Next App Router routes (UI + API/route handlers). No business logic here.
- `src/server` — the real logic, split by domain:
  - `db/` — Drizzle schema + client + migrations
  - `email/providers/` — the `EmailProvider` adapter + Gmail/Microsoft/IMAP-SMTP implementations
  - `auth/`, `security/`, `queues/`, `ai/` (later), `knowledge/` (later), `automation/` (later)
- `src/lib`, `src/validators`, `src/types` — shared helpers, Zod schemas, types.
- `workers/` process runs BullMQ queue processors (separate container).

## Email provider adapter (the "connect any inbox" core)
Everything email-related depends only on the `EmailProvider` interface (`providers/types.ts`):
`verifyConnection`, `listChanges(cursor)`, `fetchThread`, `fetchMessage`, `createDraft`,
`sendReply`, `watch`/`unwatch`. Three implementations today:
- **Gmail** — Gmail API + OAuth2 + Pub/Sub watch (history sync)
- **Microsoft** — Graph API + OAuth2 + subscriptions + delta queries
- **IMAP/SMTP** — generic; read via IMAP (imapflow), send via SMTP (nodemailer). Credentials stored
  per-mailbox, encrypted.
`registry.getProvider(mailbox)` maps `mailbox.provider` → adapter. Adding a new inbox type = new
class + one registry case; nothing else changes.

## Inbound flow (spec §9, built across phases)
webhook/poll → validate → resolve mailbox → enqueue sync job → fetch message (dedupe by provider id)
→ fetch full thread → store + sanitize → resolve business → classify (structured, Zod-validated) →
extract entities → retrieve business knowledge → generate draft → validate facts → evaluate
automation rules → auto-send only if ALL safety checks pass, else queue for approval → audit-log
every step.

## Security
- OAuth tokens + IMAP/SMTP passwords encrypted at rest (AES-256-GCM, `security/encryption.ts`).
- Env validated at startup (`env.ts`). Tokens never sent to the browser.
- Prompt-injection defence: email content is untrusted data, never instructions; business-scoped
  retrieval; output validation; explicit approval for forwarding/external attachments.
- Immutable `audit_logs`; `security_events` for blocked attempts.

## Autonomy & auto-send
Per-mailbox mode: `draft_only` (default) | `controlled_auto_send` | `disabled`. Auto-send must pass
every check in spec §16 (permitted intent, confidence threshold, no sensitive/price/promise content,
verified facts, present template variables, approved knowledge only, not suppressed/blocked, no loop,
within rate limit) or it is queued for a human.

## Background jobs
BullMQ queues (idempotent, retryable, deduplicated, tenant-scoped): mailbox sync, classification,
knowledge retrieval, draft generation, validation, sending, follow-ups, subscription/watch renewal,
attachment/document processing, embeddings, analytics, cleanup. Exponential backoff on provider
failures; permanent validation failures are not retried indefinitely.
