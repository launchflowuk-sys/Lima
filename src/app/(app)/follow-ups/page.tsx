import { getCurrentUser } from "@/server/auth/current-user";
import { listBusinessesForUser } from "@/server/businesses/service";
import { listPendingFollowUps } from "@/server/followups/service";
import { CreateFollowUpForm } from "./create-follow-up-form";
import { completeFollowUpAction, cancelFollowUpAction } from "./actions";

function fmt(date: Date): string {
  return new Date(date).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function FollowUpsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const [businesses, followUps] = await Promise.all([listBusinessesForUser(user), listPendingFollowUps(user)]);
  const businessName = new Map(businesses.map((b) => [b.id, b.name]));
  const now = Date.now();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Follow-ups</h1>
        <p className="mt-1 text-sm text-slate-500">Reminders to chase a conversation. Overdue items are highlighted.</p>
      </header>

      {businesses.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <h2 className="text-base font-semibold text-slate-900">Add a business first</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Follow-ups are per business. Create a business, then schedule reminders here.</p>
        </div>
      ) : (
        <>
          {followUps.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              Nothing pending. Schedule a follow-up below so a conversation doesn&rsquo;t slip.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Due</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Thread</th>
                    <th className="px-4 py-3">Business</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {followUps.map((f) => {
                    const overdue = new Date(f.dueAt).getTime() < now;
                    return (
                      <tr key={f.id}>
                        <td className="px-4 py-3">
                          <span className={overdue ? "font-medium text-red-600" : "text-slate-600"}>{fmt(f.dueAt)}</span>
                          {overdue && <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">overdue</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{f.reason}</td>
                        <td className="px-4 py-3 text-slate-500">{f.threadSubject ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-500">{businessName.get(f.businessId) ?? "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-3">
                            <form action={completeFollowUpAction}>
                              <input type="hidden" name="followUpId" value={f.id} />
                              <button type="submit" className="text-xs font-medium text-green-600 hover:text-green-500">Done</button>
                            </form>
                            <form action={cancelFollowUpAction}>
                              <input type="hidden" name="followUpId" value={f.id} />
                              <button type="submit" className="text-xs font-medium text-slate-500 hover:text-slate-700">Cancel</button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <CreateFollowUpForm businesses={businesses.map((b) => ({ id: b.id, name: b.name }))} />
        </>
      )}
    </div>
  );
}
