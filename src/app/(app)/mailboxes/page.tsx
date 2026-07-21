import { getCurrentUser } from "@/server/auth/current-user";
import { listBusinessesForUser } from "@/server/businesses/service";
import { listMailboxesForUser } from "@/server/mailboxes/service";
import { isGmailConfigured } from "@/server/email/providers/gmail-oauth";
import { ConnectInboxForm } from "./connect-inbox-form";
import { deleteMailboxAction, syncMailboxAction, setAutonomyAction } from "./actions";
import { AutonomySelect } from "./autonomy-select";

const STATUS_STYLES: Record<string, string> = {
  connected: "bg-green-100 text-green-700",
  error: "bg-red-100 text-red-700",
  reauth_required: "bg-amber-100 text-amber-700",
  disconnected: "bg-slate-100 text-slate-500",
};

const PROVIDER_LABELS: Record<string, string> = {
  gmail: "Gmail",
  microsoft: "Microsoft 365",
  imap_smtp: "IMAP/SMTP",
};

const ERROR_MESSAGES: Record<string, string> = {
  gmail_not_configured: "Gmail OAuth isn't configured on the server yet (missing Google client credentials).",
  gmail_missing_code: "Gmail didn't return an authorization code. Please try connecting again.",
  gmail_connect_failed: "Connecting the Gmail account failed. Please try again.",
  invalid_business: "That business could not be identified. Please try again.",
};

// Live sync (Sync now + the periodic worker) is available for these providers.
const SYNCABLE_PROVIDERS = new Set(["imap_smtp", "gmail"]);

interface MailboxesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function MailboxesPage({ searchParams }: MailboxesPageProps) {
  const user = await getCurrentUser();
  if (!user) return null;
  const params = await searchParams;
  const [businesses, mailboxes] = await Promise.all([listBusinessesForUser(user), listMailboxesForUser(user)]);
  const businessName = new Map(businesses.map((b) => [b.id, b.name]));

  const connected = typeof params.connected === "string" ? params.connected : null;
  const errorKey = typeof params.error === "string" ? params.error : null;
  const gmailReady = isGmailConfigured();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Mailboxes</h1>
        <p className="mt-1 text-sm text-slate-500">Connect Gmail, Microsoft 365, or any IMAP/SMTP inbox. New mailboxes start in draft-only mode.</p>
      </header>

      {connected === "gmail" && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Gmail account connected. It will start syncing shortly.
        </div>
      )}
      {errorKey && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {ERROR_MESSAGES[errorKey] ?? "Something went wrong. Please try again."}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-900">Connect Gmail</h2>
        <p className="mt-1 text-sm text-slate-500">
          Sign in with Google to connect a Gmail inbox via OAuth. Read and send scopes only — no password stored.
        </p>
        {gmailReady ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {businesses.length === 0 ? (
              <span className="text-sm text-slate-400">Create a business first to connect an inbox.</span>
            ) : (
              businesses.map((b) => (
                <a
                  key={b.id}
                  href={`/api/oauth/gmail/start?businessId=${b.id}`}
                  className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
                >
                  Connect Gmail for {b.name}
                </a>
              ))
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-amber-600">
            Gmail OAuth isn&apos;t configured on the server yet. Set the Google client credentials to enable it.
          </p>
        )}
      </section>

      {mailboxes.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <h2 className="text-base font-semibold text-slate-900">No mailboxes connected</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Connect your first inbox below.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mailboxes.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{m.emailAddress}</td>
                  <td className="px-4 py-3 text-slate-500">{businessName.get(m.businessId) ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{PROVIDER_LABELS[m.provider] ?? m.provider}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[m.status] ?? "bg-slate-100 text-slate-500"}`}>{m.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <AutonomySelect mailboxId={m.id} value={m.autonomyMode} action={setAutonomyAction} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      {SYNCABLE_PROVIDERS.has(m.provider) && (
                        <form action={syncMailboxAction}>
                          <input type="hidden" name="mailboxId" value={m.id} />
                          <button type="submit" className="text-xs font-medium text-blue-600 hover:text-blue-500">Sync now</button>
                        </form>
                      )}
                      <form action={deleteMailboxAction}>
                        <input type="hidden" name="mailboxId" value={m.id} />
                        <button type="submit" className="text-xs font-medium text-red-600 hover:text-red-500">Remove</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConnectInboxForm businesses={businesses.map((b) => ({ id: b.id, name: b.name }))} />

      <p className="text-xs text-slate-400">Gmail connects via OAuth (read + send). Microsoft 365 arrives in its own phase. IMAP/SMTP works now.</p>
    </div>
  );
}
