"use client";

import { useActionState } from "react";
import { updateSettingsAction, type ActionState } from "./actions";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const labelClass = "block text-xs font-medium text-slate-700 mb-1";

export function BusinessSettingsForm({
  business,
}: {
  business: { id: string; name: string; replyTone: string | null; emailSignature: string | null };
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateSettingsAction, {});

  return (
    <form action={action} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
      <input type="hidden" name="businessId" value={business.id} />
      <h2 className="text-sm font-semibold text-slate-900">{business.name}</h2>
      <div>
        <label className={labelClass}>Reply tone</label>
        <input
          name="replyTone"
          defaultValue={business.replyTone ?? ""}
          placeholder="professional, friendly, concise"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-slate-400">Guides how every AI reply for this business sounds.</p>
      </div>
      <div>
        <label className={labelClass}>Email signature</label>
        <textarea
          name="emailSignature"
          rows={3}
          defaultValue={business.emailSignature ?? ""}
          placeholder={"Kind regards,\nThe team"}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-slate-400">Appended to the end of AI-drafted replies.</p>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-green-600">Saved.</p>}
      <button type="submit" disabled={pending} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
