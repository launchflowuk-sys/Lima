# External Provider Setup

What each inbox type needs before it can be connected. (Full step-by-step is expanded as each
provider phase lands.)

## Generic IMAP/SMTP (works today for sending)
No cloud config — the user supplies, per mailbox:
- IMAP host / port / SSL / username / password (reading)
- SMTP host / port / SSL / username / password (sending)
Credentials are encrypted at rest. Works with cPanel/cloudwebhosting, Zoho, Fastmail, private domains,
and most business mailboxes.

## Gmail (Phase 2)
1. Google Cloud project → enable **Gmail API** and **Cloud Pub/Sub**.
2. OAuth consent screen + OAuth 2.0 Client (Web). Set redirect `${APP_URL}/api/mailboxes/gmail/callback`.
   Put client id/secret in `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
3. Create a Pub/Sub topic + push subscription to `${APP_URL}/api/webhooks/gmail`; set `GOOGLE_PUBSUB_TOPIC`
   and a `GOOGLE_PUBSUB_VERIFICATION_TOKEN`. Grant `gmail-api-push@system.gserviceaccount.com` publish rights.
4. Scopes: `gmail.modify` (read + draft + send + watch).

## Microsoft 365 / Outlook (Phase 3)
1. Entra ID → App registration. Redirect `${APP_URL}/api/mailboxes/microsoft/callback`.
   `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` / `MICROSOFT_TENANT_ID`.
2. Graph delegated scopes: `Mail.ReadWrite`, `Mail.Send`, `offline_access`.
3. Graph subscription webhook `${APP_URL}/api/webhooks/microsoft` with `MICROSOFT_WEBHOOK_CLIENT_STATE`;
   handle validation + lifecycle notifications; renew before expiry.

## OpenAI
Set `OPENAI_API_KEY`; models via `OPENAI_MODEL_CLASSIFICATION` / `OPENAI_MODEL_REPLY`.

## Coolify deployment
- Services: web, worker, postgres, redis, persistent `storage` volume.
- Run `pnpm db:migrate` (the compose `migrate` service) before first web start.
- Set all env vars from `.env.example`. Configure the domain + SSL, then register the Gmail/Microsoft
  webhook URLs above.
