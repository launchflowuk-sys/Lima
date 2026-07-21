import { getCurrentUser } from "@/server/auth/current-user";
import { listRulesOverview } from "@/server/automation/service";
import { CreateRuleForm } from "./create-rule-form";
import { toggleRuleAction, deleteRuleAction } from "./actions";

function actionSummary(actions: Record<string, unknown>): string {
  const parts: string[] = [];
  if (actions.autoSend) parts.push("auto-send");
  if (actions.holdForApproval) parts.push("hold");
  if (actions.escalate) parts.push("escalate");
  if (Array.isArray(actions.addTags) && actions.addTags.length) parts.push(`tag: ${(actions.addTags as string[]).join(", ")}`);
  return parts.join(" · ") || "—";
}

function conditionSummary(c: Record<string, unknown>): string {
  const parts: string[] = [];
  if (Array.isArray(c.intents) && c.intents.length) parts.push(`intent ∈ ${(c.intents as string[]).join("/")}`);
  if (Array.isArray(c.excludeIntents) && c.excludeIntents.length) parts.push(`not ${(c.excludeIntents as string[]).join("/")}`);
  if (c.maxRiskLevel) parts.push(`risk ≤ ${c.maxRiskLevel}`);
  if (Array.isArray(c.fromContains) && c.fromContains.length) parts.push(`from~${(c.fromContains as string[]).join("/")}`);
  if (Array.isArray(c.subjectContains) && c.subjectContains.length) parts.push(`subject~${(c.subjectContains as string[]).join("/")}`);
  return parts.join(" · ") || "any message";
}

export default async function AutomationPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { businesses, rules } = await listRulesOverview(user);
  const businessName = new Map(businesses.map((b) => [b.id, b.name]));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Automation</h1>
        <p className="mt-1 text-sm text-slate-500">
          Rules decide what happens to a message after it&rsquo;s classified — tag it, escalate it, or allow
          a controlled auto-reply. Safety always has the final say: risky or sensitive mail is never auto-sent.
        </p>
      </header>

      {businesses.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <h2 className="text-base font-semibold text-slate-900">Add a business first</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Rules are per business. Create a business, then add rules here.</p>
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Rules ({rules.length})</h2>
            {rules.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                No rules yet. Every message currently becomes a draft for approval. Add a rule below to change that.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Priority</th>
                      <th className="px-4 py-3">Rule</th>
                      <th className="px-4 py-3">When</th>
                      <th className="px-4 py-3">Then</th>
                      <th className="px-4 py-3">Business</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rules.map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-3 text-slate-500">{r.priority}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {r.name}
                          {r.stopOnMatch && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">stop</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{conditionSummary(r.conditions as Record<string, unknown>)}</td>
                        <td className="px-4 py-3 text-xs text-slate-700">{actionSummary(r.actions as Record<string, unknown>)}</td>
                        <td className="px-4 py-3 text-slate-500">{businessName.get(r.businessId) ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${r.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                            {r.isActive ? "Active" : "Off"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-3">
                            <form action={toggleRuleAction}>
                              <input type="hidden" name="ruleId" value={r.id} />
                              <input type="hidden" name="isActive" value={String(r.isActive)} />
                              <button type="submit" className="text-xs font-medium text-blue-600 hover:text-blue-500">{r.isActive ? "Disable" : "Enable"}</button>
                            </form>
                            <form action={deleteRuleAction}>
                              <input type="hidden" name="ruleId" value={r.id} />
                              <button type="submit" className="text-xs font-medium text-red-600 hover:text-red-500">Delete</button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <CreateRuleForm businesses={businesses.map((b) => ({ id: b.id, name: b.name }))} />
        </>
      )}
    </div>
  );
}
