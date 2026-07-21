import { getCurrentUser } from "@/server/auth/current-user";
import { listRecentAudit } from "@/server/audit/query";

export default async function AuditPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const entries = await listRecentAudit(user);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Audit log</h1>
        <p className="mt-1 text-sm text-slate-500">Immutable record of every significant action.</p>
      </header>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">No audit entries yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">By</th>
                <th className="px-4 py-3">Entity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{new Date(e.createdAt).toLocaleString("en-GB")}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{e.action}</td>
                  <td className="px-4 py-3 text-slate-500">{e.actorType}</td>
                  <td className="px-4 py-3 text-slate-400">{e.entityType ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
