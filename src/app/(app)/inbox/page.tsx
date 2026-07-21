import Link from "next/link";
import { getCurrentUser } from "@/server/auth/current-user";
import { listThreadsForUser } from "@/server/inbox/service";

const STATUS_STYLES: Record<string, string> = {
  needs_reply: "bg-blue-100 text-blue-700",
  awaiting_approval: "bg-amber-100 text-amber-700",
  draft_prepared: "bg-indigo-100 text-indigo-700",
  auto_replied: "bg-green-100 text-green-700",
  waiting_customer: "bg-slate-100 text-slate-500",
  waiting_internal: "bg-slate-100 text-slate-500",
  escalated: "bg-red-100 text-red-700",
  closed: "bg-slate-100 text-slate-400",
  no_reply_required: "bg-slate-100 text-slate-400",
};

export default async function InboxPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const threads = await listThreadsForUser(user);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inbox</h1>
        <p className="mt-1 text-sm text-slate-500">Every connected mailbox, unified.</p>
      </header>

      {threads.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <h2 className="text-base font-semibold text-slate-900">Nothing here yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Connect an inbox on the Mailboxes page and hit “Sync now” to pull your recent mail in.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
          {threads.map((t) => (
            <Link key={t.id} href={`/inbox/${t.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
              <span className={`h-2 w-2 flex-shrink-0 rounded-full ${t.isRead ? "bg-transparent" : "bg-blue-500"}`} />
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm ${t.isRead ? "text-slate-700" : "font-semibold text-slate-900"}`}>{t.subject || "(no subject)"}</p>
                <p className="truncate text-xs text-slate-400">{t.businessName}</p>
              </div>
              <span className={`hidden sm:inline-flex flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[t.status] ?? "bg-slate-100 text-slate-500"}`}>
                {t.status.replace(/_/g, " ")}
              </span>
              <span className="flex-shrink-0 text-xs text-slate-400 w-24 text-right">
                {t.lastMessageAt ? new Date(t.lastMessageAt).toLocaleDateString("en-GB") : ""}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
