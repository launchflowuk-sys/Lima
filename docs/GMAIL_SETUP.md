# Gmail connection — Google Cloud setup (do this once)

This is everything you create in Google Cloud so Agent Lima can connect Gmail / Google Workspace
inboxes over OAuth. The **code** is built into the app; this guide produces the four values it needs:

```
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI      # https://agentlima.com/api/oauth/gmail/callback
GOOGLE_PUBSUB_TOPIC      # optional — only for real-time push (Phase 2b). Polling works without it.
```

You add these in **Coolify → the Lima app → Environment** (never in chat). `ENCRYPTION_KEY` (already set)
encrypts the OAuth tokens at rest, so nothing sensitive is ever stored in plain text.

---

## Decide first: Internal vs External app

This choice decides whether you need Google verification.

| Your situation | Choose | Verification |
|---|---|---|
| All the mailboxes you'll connect are on **one Google Workspace org** you control | **Internal** | **None.** Cleanest path — full access, no review, tokens don't expire early. |
| You'll connect **plain @gmail.com** accounts or mailboxes across **different orgs** | **External** | Testing mode = up to 100 test users, **but refresh tokens expire after 7 days**. For permanent use you must **publish** the app and pass Google verification (Gmail read is a *restricted* scope → CASA security assessment). |

> **Why this matters:** reading Gmail requires the `gmail.readonly` **restricted** scope — there is no
> lighter read scope. For your own business inboxes, put them under a Workspace org and use **Internal**
> to skip all verification. If they're separate Gmail accounts, budget for the External + verification
> path before relying on it in production.

---

## Step 1 — Create / pick a Google Cloud project

1. Go to <https://console.cloud.google.com>.
2. Top bar → project dropdown → **New Project**. Name it e.g. `agent-lima`. Create, then select it.

## Step 2 — Enable the Gmail API

1. **APIs & Services → Library** (or search "Gmail API").
2. Open **Gmail API** → **Enable**.

## Step 3 — Configure the OAuth consent screen

1. **APIs & Services → OAuth consent screen** (newer console: **Google Auth Platform → Branding**).
2. **User type:** pick **Internal** or **External** per the table above → Create.
3. **App information:**
   - App name: `Agent Lima`
   - User support email: your email
   - App logo (optional)
   - App domain → Application home page: `https://agentlima.com`
   - Authorised domain: `agentlima.com`
   - Developer contact email: your email
4. **Scopes → Add or remove scopes** — add these three:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/userinfo.email`
   Save.
5. **Test users** (External only): add every Gmail address you'll connect (e.g. the Grays CabLine
   inbox) while the app is in Testing.
6. Save.

## Step 4 — Create the OAuth 2.0 Client ID

1. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
2. **Application type: Web application**. Name: `Agent Lima web`.
3. **Authorised redirect URIs → Add URI** (add both):
   - `https://agentlima.com/api/oauth/gmail/callback`
   - `http://localhost:3000/api/oauth/gmail/callback`  *(for local testing)*
4. **Create.** Google shows your **Client ID** and **Client secret** — copy both now.

## Step 5 — Put the values in Coolify

In **Coolify → Lima app → Environment**, add:

```
GOOGLE_CLIENT_ID=<the client id>
GOOGLE_CLIENT_SECRET=<the client secret>
GOOGLE_REDIRECT_URI=https://agentlima.com/api/oauth/gmail/callback
```

Redeploy. For **local** testing use `http://localhost:3000/api/oauth/gmail/callback` in your `.env`.

## Step 6 — Connect a mailbox

1. Sign in to Agent Lima → **Mailboxes**.
2. Pick a business → **Connect Gmail** → Google consent screen → allow.
3. You're redirected back; the mailbox appears as **connected**. Mail syncs on the worker's schedule
   (or **Sync now**), then classify → draft → approve → send runs exactly as it does for IMAP.

---

## Optional — real-time push (Phase 2b, not required to ship)

Polling every couple of minutes is the default and is production-fine. If you later want instant
delivery via Gmail `watch` + Pub/Sub:

1. **Enable** the *Cloud Pub/Sub API*.
2. **Pub/Sub → Create topic**, e.g. `gmail-push`. Full name is
   `projects/<project-id>/topics/gmail-push` → that's `GOOGLE_PUBSUB_TOPIC`.
3. Grant `gmail-api-push@system.gserviceaccount.com` the **Pub/Sub Publisher** role on the topic.
4. Create a **push subscription** delivering to `https://agentlima.com/api/oauth/gmail/push` with a
   verification token → `GOOGLE_PUBSUB_VERIFICATION_TOKEN`.
5. Add both env vars + redeploy. The app registers `watch` per mailbox and renews it before the 7-day
   Gmail expiry.

---

## Troubleshooting

- **`redirect_uri_mismatch`** — the URI in Step 4 must match `GOOGLE_REDIRECT_URI` *exactly* (scheme,
  host, path, no trailing slash).
- **`access_blocked / app not verified`** — you're External + not verified; add the address as a Test
  user, or switch to Internal, or publish + verify.
- **Refresh token missing / re-consent every time** — the app requests `access_type=offline` +
  `prompt=consent`, which forces a refresh token on first connect. If a token was issued without one,
  remove and reconnect the mailbox.
- **Connected mailbox stops syncing after ~7 days (External/Testing)** — expected in Testing mode;
  publish the app to stop the 7-day refresh-token expiry.
