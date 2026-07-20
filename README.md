# LaunchFlow Inbox Agent (Lima)

Self-hosted, multi-business email monitoring & reply agent. Connects Gmail, Microsoft 365, and **any
IMAP/SMTP mailbox**; understands threads, classifies enquiries, drafts replies in each business's
voice, and either queues them for approval or auto-sends under strict pre-approved rules.

## Stack
Next.js 16 (App Router, TS strict) · Tailwind + shadcn/ui · PostgreSQL + Drizzle · Redis + BullMQ ·
OpenAI · Gmail API / Microsoft Graph / IMAP-SMTP · Docker + Coolify.

## Local development
```bash
cp .env.example .env          # fill DATABASE_URL, REDIS_URL, SESSION_SECRET, ENCRYPTION_KEY
#   openssl rand -base64 48   -> SESSION_SECRET
#   openssl rand -base64 32   -> ENCRYPTION_KEY
pnpm install
pnpm db:generate              # generate SQL migrations from the Drizzle schema
pnpm db:migrate               # apply them
pnpm dev                      # web app on http://localhost:3000
pnpm worker                   # background worker (separate terminal)
```

## Scripts
dev · build · start · worker · typecheck · lint · test · db:generate · db:migrate · db:studio

## Docs
- docs/architecture.md — how it fits together
- docs/provider-setup.md — Gmail / Microsoft / IMAP / OpenAI / Coolify setup
- BUILD_PROGRESS.md — phase-by-phase status

Built by LaunchFlow.
