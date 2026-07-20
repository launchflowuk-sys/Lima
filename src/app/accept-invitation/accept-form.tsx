"use client";

import { useActionState } from "react";
import { acceptInvitationAction, type AcceptState } from "./actions";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const labelClass = "block text-xs font-medium text-slate-700 mb-1";

export function AcceptForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState<AcceptState, FormData>(acceptInvitationAction, {});

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <label className={labelClass}>Email</label>
        <input value={email} readOnly className={`${inputClass} bg-slate-50 text-slate-500`} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>First name</label>
          <input name="firstName" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Last name</label>
          <input name="lastName" className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Choose a password</label>
        <input name="password" type="password" required minLength={10} placeholder="At least 10 characters" className={inputClass} />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending} className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
        {pending ? "Setting up…" : "Accept & sign in"}
      </button>
    </form>
  );
}
