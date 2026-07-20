# Runbook — get Lima running & test it end to end

Everything below is what **you** do on your machine/server. The app, worker, migrations and pipeline
are built; this is how to bring them up and exercise them.

## 1. One-time local setup

```bash
cp .env.example .env
```

Fill these (the only ones required to boot):

| Var | How to get it |
|-----|---------------|
| `DATABASE_URL` | `postgres://user:pass@localhost:5432/lima` (docker-compose starts Postgres) |
| `REDIS_URL` | `redis://localhost:6379` (docker-compose starts Redis) |
| `APP_URL` | `http://localhost:3000` |
| `SESSION_SECRET` | `openssl rand -base64 48` |
| `ENCRYPTION_KEY` | `openssl rand -base64 32` |
| `OPENAI_API_KEY` | your OpenAI key — **needed for classification + drafting**. Without it the inbox/knowledge/rules all still work; only AI drafting is skipped. |

Optional now, needed later: `SMTP_*` (notification emails), `GOOGLE_*` / `MICROSOFT_*` (cloud inboxes).

```bash
docker compose up -d postgres redis     # or point DATABASE_URL/REDIS_URL at your own
pnpm install
pnpm db:migrate                          # applies migrations 0000–0004
SEED_OWNER_EMAIL=you@example.com SEED_OWNER_PASSWORD='a-strong-password' pnpm db:seed
pnpm dev                                 # web  → http://localhost:3000
pnpm worker                              # worker → separate terminal
```

Sign in at `/login` with the seed owner.

## 2. Exercise the full pipeline (IMAP — works today, no cloud setup)

1. **Businesses** → add a business (e.g. "Grays CabLine").
2. **Knowledge** → add a few approved facts (opening hours, a price, a service). Give core facts a
   higher priority. This is the ONLY source of truth the AI may use.
3. **Mailboxes** → **Connect IMAP/SMTP inbox**. Use a real mailbox you own (host/port/user/pass for
   both IMAP and SMTP). It live-verifies on save.
4. **Settings** → set the business's reply tone + signature.
5. **Automation** (optional) → add a rule, e.g. *intents = booking_enquiry, general_enquiry → Allow
   auto-send*. Add another: *maxRiskLevel = high excluded / complaint → Escalate*.
6. Send a test email **into** that mailbox from another account.
7. **Mailboxes → Sync now** (or wait ~2 min for the worker's scheduled sync). The message appears in
   **Inbox**.
8. Open the thread → **Generate AI draft** (or, with the worker running + `OPENAI_API_KEY` set, it
   drafts automatically). Check the draft only used your approved facts.
9. **Approvals** → edit if needed → **Approve & send**. The reply goes out via SMTP and is written
   back into the thread.

### To test controlled auto-send (Mode 2)
- **Mailboxes** → set that mailbox's mode to **Controlled auto-send**.
- Ensure an automation rule with **Allow auto-send** matches the message's intent.
- Auto-send still only fires if the safety policy passes (never for complaints/refunds/payments/
  contracts, angry/threatening tone, high risk, or low confidence). Those become drafts or escalate.

### To test follow-ups + notifications
- **Follow-ups** → schedule one with a due time a minute out. The worker's 15-min scan (or run it
  sooner by lowering the interval) notifies you; see **Notifications** (sidebar badge). Escalations
  notify the assignee or you (owner). Emails also send if `SMTP_*` is set.

## 3. Deploy (Coolify)

- Push is already wired to `github.com/launchflowuk-sys/Lima`.
- In Coolify: one service from the `Dockerfile` (web), one from the same image running `pnpm worker`,
  plus Postgres + Redis. Set the same env vars. Run `pnpm db:migrate` on release.
- Point your domain at the web service; set `APP_URL` to it.

## 4. Mobile app

`mobile/` is an Expo (SDK 57) app consuming `/api/v1`. To run it:
```bash
cd mobile && npm install
# set expo.extra.apiUrl in app.json to your APP_URL
npx expo start        # Expo Go
```
EAS build/submit to TestFlight + Play needs your Apple/Google credentials — see the mobile section of
BUILD_PROGRESS.md.

## What still needs YOUR input to finish
- **Gmail / Microsoft 365 inboxes**: require a Google Cloud OAuth client + Pub/Sub topic, and an Entra
  app registration. Once you create those and add `GOOGLE_*` / `MICROSOFT_*` to `.env`, the connect
  flow is wired to use them. (IMAP/SMTP needs none of this and works now.)
- **Store submission**: Apple Developer + App Store Connect API key; Google Play service-account JSON.
