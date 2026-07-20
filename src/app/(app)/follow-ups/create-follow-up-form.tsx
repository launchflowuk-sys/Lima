"use client";

import { useActionState, useEffect, useRef } from "react";
import { createFollowUpAction, type ActionState } from "./actions";

type BusinessOption = { id: string; name: string };

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const labelClass = "block text-xs font-medium text-slate-700 mb-1";

export function CreateFollowUpForm({ businesses }: { businesses: BusinessOption[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createFollowUpAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
      <h2 className="text-sm font-semibold text-slate-900">Schedule a follow-up</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Business</label>
          <select name="businessId" required className={inputClass} defaultValue={businesses[0]?.id ?? ""}>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Due</label>
          <input name="dueAt" type="datetime-local" required className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Reason</label>
        <input name="reason" required placeholder="Chase the customer if no reply about the Friday booking" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Thread ID (optional)</label>
        <input name="threadId" placeholder="Link to a specific conversation" className={inputClass} />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-green-600">Follow-up scheduled.</p>}
      <button type="submit" disabled={pending} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
        {pending ? "Saving…" : "Schedule follow-up"}
      </button>
    </form>
  );
}
