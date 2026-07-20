import Link from "next/link";
import { getCurrentUser } from "@/server/auth/current-user";
import { listNotifications } from "@/server/notifications/service";
import { markReadAction, markAllReadAction } from "./actions";

function fmt(date: Date): string {
  return new Date(date).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const items = await listNotifications(user);
  const hasUnread = items.some((n) => !n.isRead);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500">Escalations, follow-ups due, and other alerts.</p>
        </div>
        {hasUnread && (
          <form action={markAllReadAction}>
            <button type="submit" className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Mark all read</button>
          </form>
        )}
      </header>

      {items.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <h2 className="text-base font-semibold text-slate-900">You&rsquo;re all caught up</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Alerts about escalations and due follow-ups will appear here.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.id} className={`rounded-xl border p-4 ${n.isRead ? "border-slate-200 bg-white" : "border-blue-200 bg-blue-50/50"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {!n.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                    <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                  </div>
                  {n.body && <p className="mt-0.5 text-sm text-slate-600">{n.body}</p>}
                  <p className="mt-1 text-xs text-slate-400">{fmt(n.createdAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {n.linkPath && (
                    <Link href={n.linkPath} className="text-xs font-medium text-blue-600 hover:text-blue-500">Open</Link>
                  )}
                  {!n.isRead && (
                    <form action={markReadAction}>
                      <input type="hidden" name="notificationId" value={n.id} />
                      <button type="submit" className="text-xs font-medium text-slate-500 hover:text-slate-700">Mark read</button>
                    </form>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
