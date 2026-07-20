"use client";

import { useActionState } from "react";
import { inviteAction, type InviteState } from "./actions";

const ROLES = ["manager", "agent", "read_only", "owner"] as const;
const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export function InviteForm() {
  const [state, action, pending] = useActionState<InviteState, FormData>(inviteAction, {});

  return (
    <form action={action} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
      <h2 className="text-sm font-semibold text-slate-900">Invite a teammate</h2>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3">
        <input name="email" type="email" required placeholder="teammate@company.com" className={inputClass} />
        <select name="role" defaultValue="agent" className={inputClass}>
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <button type="submit" disabled={pending} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
          {pending ? "Creating…" : "Create invite"}
        </button>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && state.link && (
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-600">Invitation link (email delivery arrives with the notifications phase — share this manually for now):</p>
          <code className="mt-1 block break-all text-xs text-blue-700">{state.link}</code>
        </div>
      )}
    </form>
  );
}
