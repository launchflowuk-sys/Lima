import { getCurrentUser } from "@/server/auth/current-user";
import { getAnalytics } from "@/server/analytics/service";

function Bar({ label, count, max }: { label: string; count: number; max: number }) {
  const width = max > 0 ? Math.max(4, Math.round((count / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-40 shrink-0 truncate text-xs text-slate-600">{label}</div>
      <div className="h-5 flex-1 rounded bg-slate-100">
        <div className="h-5 rounded bg-blue-500/80" style={{ width: `${width}%` }} />
      </div>
      <div className="w-10 shrink-0 text-right text-xs font-medium text-slate-700">{count}</div>
    </div>
  );
}

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const a = await getAnalytics(user, 30);

  const intentMax = Math.max(0, ...a.intentBreakdown.map((r) => r.count));
  const sentimentMax = Math.max(0, ...a.sentimentBreakdown.map((r) => r.count));
  const hasData = a.totalReceived > 0 || a.totalSent > 0 || a.intentBreakdown.length > 0;

  const cards: Array<{ label: string; value: string | number }> = [
    { label: "Received (30d)", value: a.totalReceived },
    { label: "Sent (30d)", value: a.totalSent },
    { label: "Auto-sent (30d)", value: a.autoSentCount },
    { label: "Auto-send rate", value: a.autoSendRate === null ? "—" : `${Math.round(a.autoSendRate * 100)}%` },
    { label: "Est. AI cost (30d)", value: `$${a.estimatedAiCostUsd.toFixed(2)}` },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">Last {a.windowDays} days across your businesses.</p>
      </header>

      {!a.hasBusiness ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <h2 className="text-base font-semibold text-slate-900">Add a business first</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Analytics appear once your businesses start handling mail.</p>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {cards.map((c) => (
              <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-medium text-slate-500">{c.label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{c.value}</p>
              </div>
            ))}
          </section>

          {!hasData ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              No classified mail in this window yet. Once inboxes sync and messages are classified, intent and sentiment breakdowns show here.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="mb-4 text-sm font-semibold text-slate-900">Intents</h2>
                <div className="space-y-2">
                  {a.intentBreakdown.length === 0 ? (
                    <p className="text-xs text-slate-400">No data.</p>
                  ) : (
                    a.intentBreakdown.map((r) => <Bar key={r.intent} label={r.intent} count={r.count} max={intentMax} />)
                  )}
                </div>
              </section>
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="mb-4 text-sm font-semibold text-slate-900">Sentiment</h2>
                <div className="space-y-2">
                  {a.sentimentBreakdown.length === 0 ? (
                    <p className="text-xs text-slate-400">No data.</p>
                  ) : (
                    a.sentimentBreakdown.map((r) => <Bar key={r.sentiment} label={r.sentiment} count={r.count} max={sentimentMax} />)
                  )}
                </div>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}
