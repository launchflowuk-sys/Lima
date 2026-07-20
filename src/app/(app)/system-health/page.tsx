import { getCurrentUser } from "@/server/auth/current-user";
import { getHealthSnapshot } from "@/server/health/service";

const STATUS_STYLES: Record<string, string> = {
  connected: "bg-green-100 text-green-700",
  error: "bg-red-100 text-red-700",
  reauth_required: "bg-amber-100 text-amber-700",
  disconnected: "bg-slate-100 text-slate-500",
};

export default async function SystemHealthPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const snapshot = await getHealthSnapshot(user);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">System health</h1>
        <p className="mt-1 text-sm text-slate-500">Mailbox connections, last sync, and pending work.</p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Mailboxes</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{snapshot.mailboxes.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Threads</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{snapshot.threadCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Awaiting approval</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{snapshot.pendingDrafts}</p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Mailbox connections</h2>
        {snapshot.mailboxes.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">No mailboxes connected.</div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                <tr>
                  <th className="px-4 py-3">Mailbox</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last sync</th>
                  <th className="px-4 py-3">Last error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {snapshot.mailboxes.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{m.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[m.status] ?? "bg-slate-100 text-slate-500"}`}>{m.status}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{m.lastSyncedAt ? new Date(m.lastSyncedAt).toLocaleString("en-GB") : "never"}</td>
                    <td className="px-4 py-3 text-red-600">{m.lastError ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
