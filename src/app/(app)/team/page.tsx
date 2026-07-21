import { getCurrentUser } from "@/server/auth/current-user";
import { listTeam } from "@/server/team/service";
import { InviteForm } from "./invite-form";
import { revokeInviteAction, grantAccessAction, revokeAccessAction } from "./actions";

const ROLES = ["manager", "agent", "read_only", "owner"] as const;

export default async function TeamPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { members, invitations, businesses } = await listTeam(user);
  const businessName = new Map(businesses.map((b) => [b.id, b.name]));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Team</h1>
        <p className="mt-1 text-sm text-slate-500">People in your organisation and what they can access.</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Members ({members.length})</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
              <tr>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Business access</th>
                {user.isOwner && <th className="px-4 py-3">Grant access</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{m.name ?? m.email}</div>
                    {m.name && <div className="text-xs text-slate-500">{m.email}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {m.isOwner ? <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">Owner</span> : <span className="text-xs text-slate-500">Member</span>}
                  </td>
                  <td className="px-4 py-3">
                    {m.isOwner ? (
                      <span className="text-xs text-slate-500">All businesses</span>
                    ) : m.access.length === 0 ? (
                      <span className="text-xs text-slate-400">None</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {m.access.map((a) => (
                          <span key={a.businessId} className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                            {businessName.get(a.businessId) ?? "—"}: {a.role}
                            {user.isOwner && (
                              <form action={revokeAccessAction} className="inline">
                                <input type="hidden" name="userId" value={m.id} />
                                <input type="hidden" name="businessId" value={a.businessId} />
                                <button type="submit" className="text-red-500 hover:text-red-600" title="Revoke">×</button>
                              </form>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  {user.isOwner && (
                    <td className="px-4 py-3">
                      {m.isOwner ? (
                        <span className="text-xs text-slate-400">—</span>
                      ) : businesses.length === 0 ? (
                        <span className="text-xs text-slate-400">No businesses</span>
                      ) : (
                        <form action={grantAccessAction} className="flex items-center gap-2">
                          <input type="hidden" name="userId" value={m.id} />
                          <select name="businessId" className="rounded border border-slate-300 px-1.5 py-1 text-xs">
                            {businesses.map((b) => (
                              <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                          </select>
                          <select name="role" defaultValue="agent" className="rounded border border-slate-300 px-1.5 py-1 text-xs">
                            {ROLES.filter((r) => r !== "owner").map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                          <button type="submit" className="text-xs font-medium text-blue-600 hover:text-blue-500">Grant</button>
                        </form>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {invitations.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Pending invitations ({invitations.length})</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                <tr>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Expires</th>
                  {user.isOwner && <th className="px-4 py-3"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invitations.map((i) => (
                  <tr key={i.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{i.email}</td>
                    <td className="px-4 py-3 text-slate-500">{i.role}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(i.expiresAt).toLocaleDateString("en-GB")}</td>
                    {user.isOwner && (
                      <td className="px-4 py-3 text-right">
                        <form action={revokeInviteAction}>
                          <input type="hidden" name="invitationId" value={i.id} />
                          <button type="submit" className="text-xs font-medium text-red-600 hover:text-red-500">Revoke</button>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {user.isOwner && <InviteForm />}
    </div>
  );
}
