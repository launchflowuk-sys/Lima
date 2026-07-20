import Link from "next/link";
import { getCurrentUser } from "@/server/auth/current-user";
import { listPendingDrafts } from "@/server/approvals/service";
import { approveDraftAction, rejectDraftAction } from "./actions";

export default async function ApprovalsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const drafts = await listPendingDrafts(user);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Approvals</h1>
        <p className="mt-1 text-sm text-slate-500">Review AI-drafted replies before they’re sent. Edit inline if needed.</p>
      </header>

      {drafts.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <h2 className="text-base font-semibold text-slate-900">Nothing to approve</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Generate a draft from a thread in the Inbox and it’ll appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {drafts.map((d) => (
            <div key={d.id} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/inbox/${d.threadId}`} className="text-sm font-semibold text-slate-900 hover:text-blue-600">
                    {d.threadSubject || "(no subject)"}
                  </Link>
                  <p className="text-xs text-slate-400">{d.subject}</p>
                </div>
                {d.autoSendBlockedReason && (
                  <span className="flex-shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700" title={d.autoSendBlockedReason}>
                    Approval required
                  </span>
                )}
              </div>

              <form action={approveDraftAction} className="space-y-3">
                <input type="hidden" name="draftId" value={d.id} />
                <textarea name="finalBody" defaultValue={d.bodyText} rows={7} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {d.autoSendBlockedReason && <p className="text-xs text-amber-600">Why a human is needed: {d.autoSendBlockedReason}</p>}
                <div className="flex items-center gap-2">
                  <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">Approve &amp; send</button>
                  <button type="submit" formAction={rejectDraftAction} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Reject</button>
                </div>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
