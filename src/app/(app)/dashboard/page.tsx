/**
 * Dashboard (spec §6). Shows real operational KPIs with honest empty states — no fake charts or
 * invented statistics before real data exists. The metric queries are wired in the dashboard phase
 * once mailboxes and email sync produce data.
 */
const KPIS: Array<{ label: string; hint: string }> = [
  { label: "Emails received today", hint: "Connect a mailbox to start" },
  { label: "Replies sent today", hint: "—" },
  { label: "Awaiting approval", hint: "—" },
  { label: "Needs attention", hint: "—" },
  { label: "Avg first response", hint: "—" },
  { label: "Auto-send rate", hint: "—" },
  { label: "Escalated", hint: "—" },
  { label: "Follow-ups due today", hint: "—" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Overview across your connected businesses.</p>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">{kpi.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">—</p>
            <p className="mt-1 text-xs text-slate-400">{kpi.hint}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-10 text-center">
        <h2 className="text-base font-semibold text-slate-900">No data yet</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
          Connect your first inbox — Gmail, Microsoft 365, or any IMAP/SMTP mailbox — and the
          dashboard will fill with live volume, response times and approval metrics.
        </p>
        <a
          href="/mailboxes"
          className="mt-5 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
        >
          Connect a mailbox
        </a>
      </section>
    </div>
  );
}
