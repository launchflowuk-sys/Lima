import { getCurrentUser } from "@/server/auth/current-user";
import { listBusinessesForUser } from "@/server/businesses/service";
import { listMailboxesForUser } from "@/server/mailboxes/service";
import { ConnectInboxForm } from "./connect-inbox-form";
import { deleteMailboxAction, syncMailboxAction } from "./actions";

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

export default async function MailboxesPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const [businesses, mailboxes] = await Promise.all([listBusinessesForUser(user), listMailboxesForUser(user)]);
  const businessName = new Map(businesses.map((b) => [b.id, b.name]));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Mailboxes</h1>
        <p className="mt-1 text-sm text-slate-500">Connect Gmail, Microsoft 365, or any IMAP/SMTP inbox. New mailboxes start in draft-only mode.</p>
      </header>

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
                  <td className="px-4 py-3 text-slate-500">{m.autonomyMode.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      {m.provider === "imap_smtp" && (
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

      <p className="text-xs text-slate-400">Gmail and Microsoft 365 connect via OAuth (coming in their setup phase). IMAP/SMTP works now.</p>
    </div>
  );
}
