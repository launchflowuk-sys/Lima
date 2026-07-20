import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/server/auth/current-user";
import { getThreadForUser } from "@/server/inbox/service";

export default async function ThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const data = await getThreadForUser(user, threadId);
  if (!data) notFound();
  const { thread, messages } = data;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/inbox" className="text-sm font-medium text-slate-500 hover:text-slate-700">← Inbox</Link>
        <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-900">{thread.subject || "(no subject)"}</h1>
        <p className="mt-1 text-sm text-slate-500">Status: {thread.status.replace(/_/g, " ")}</p>
      </div>

      <div className="space-y-4">
        {messages.map((m) => (
          <article
            key={m.id}
            className={`rounded-xl border p-5 ${m.direction === "outbound" ? "border-blue-100 bg-blue-50/40" : "border-slate-200 bg-white"}`}
          >
            <header className="mb-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{m.fromName || m.fromAddress || "Unknown sender"}</p>
                <p className="truncate text-xs text-slate-400">{m.fromAddress}</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${m.direction === "outbound" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                  {m.direction}
                </span>
                <p className="mt-1 text-xs text-slate-400">{m.sentAt ? new Date(m.sentAt).toLocaleString("en-GB") : ""}</p>
              </div>
            </header>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {m.bodyText || m.snippet || "(no text content)"}
            </div>
          </article>
        ))}
      </div>

      <p className="text-xs text-slate-400">AI classification, the intelligence panel and the reply editor attach here in the AI + approval phases.</p>
    </div>
  );
}
