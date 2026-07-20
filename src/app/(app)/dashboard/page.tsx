import { getCurrentUser } from "@/server/auth/current-user";
import { getDashboardStats } from "@/server/analytics/service";

/**
 * Dashboard (spec §6). Real operational KPIs across the user's businesses, with an honest empty state
 * until a mailbox produces data — no invented numbers.
 */
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const s = await getDashboardStats(user);

  const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);
  const kpis: Array<{ label: string; value: string | number }> = [
    { label: "Emails received today", value: s.emailsReceivedToday },
    { label: "Replies sent today", value: s.repliesSentToday },
    { label: "Awaiting approval", value: s.awaitingApproval },
    { label: "Needs attention", value: s.needsAttention },
    { label: "Auto-sent today", value: s.autoSentToday },
    { label: "Auto-send rate", value: pct(s.autoSendRate) },
    { label: "Escalated", value: s.escalated },
    { label: "Follow-ups due today", value: s.followUpsDueToday },
  ];

  const noActivity =
    s.emailsReceivedToday === 0 && s.repliesSentToday === 0 && s.awaitingApproval === 0 && s.needsAttention === 0;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Overview across your connected businesses.</p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">{kpi.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{kpi.value}</p>
          </div>
        ))}
      </section>

      {!s.hasBusiness ? (
        <section className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <h2 className="text-base font-semibold text-slate-900">Add your first business</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Create a business, connect an inbox, and the dashboard fills with live metrics.</p>
          <a href="/businesses" className="mt-5 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500">Add a business</a>
        </section>
      ) : noActivity ? (
        <section className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <h2 className="text-base font-semibold text-slate-900">No activity yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Connect an inbox and run a sync — received mail, drafts and approvals will show up here.</p>
          <a href="/mailboxes" className="mt-5 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500">Connect a mailbox</a>
        </section>
      ) : (
        <section className="flex flex-wrap gap-3">
          <a href="/approvals" className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Review {s.awaitingApproval} awaiting approval →</a>
          <a href="/inbox" className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Open inbox →</a>
          {s.followUpsDueToday > 0 && <a href="/follow-ups" className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">{s.followUpsDueToday} follow-ups due →</a>}
        </section>
      )}
    </div>
  );
}
