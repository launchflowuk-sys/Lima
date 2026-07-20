"use client";

import { useActionState, useEffect, useRef } from "react";
import { createRuleAction, type ActionState } from "./actions";

type BusinessOption = { id: string; name: string };

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const labelClass = "block text-xs font-medium text-slate-700 mb-1";

export function CreateRuleForm({ businesses }: { businesses: BusinessOption[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createRuleAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Add an automation rule</h2>
        <p className="mt-1 text-xs text-slate-500">
          Rules run after each message is classified, lowest priority number first. Auto-send only ever
          fires when the safety policy also allows it AND the mailbox is in controlled auto-send mode.
        </p>
      </div>

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
          <label className={labelClass}>Priority</label>
          <input name="priority" type="number" min={0} max={1000} defaultValue={100} className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Rule name</label>
        <input name="name" required placeholder="Auto-acknowledge simple booking enquiries" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Description (optional)</label>
        <input name="description" className={inputClass} />
      </div>

      <fieldset className="rounded-lg border border-slate-200 p-3 space-y-3">
        <legend className="px-1 text-xs font-semibold text-slate-600">Conditions (all must match; leave blank to ignore)</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Intents (comma-separated)</label>
            <input name="intents" placeholder="booking_enquiry, general_enquiry" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Exclude intents</label>
            <input name="excludeIntents" placeholder="complaint, refund_request" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>From address contains</label>
            <input name="fromContains" placeholder="@vip-client.com" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Subject contains</label>
            <input name="subjectContains" placeholder="invoice" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Max risk level</label>
            <select name="maxRiskLevel" className={inputClass} defaultValue="">
              <option value="">Any</option>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-slate-200 p-3 space-y-3">
        <legend className="px-1 text-xs font-semibold text-slate-600">Actions</legend>
        <div className="flex flex-wrap gap-4 text-sm text-slate-700">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" name="autoSend" className="rounded border-slate-300" /> Allow auto-send
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" name="holdForApproval" className="rounded border-slate-300" /> Hold for approval
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" name="escalate" className="rounded border-slate-300" /> Escalate
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" name="stopOnMatch" className="rounded border-slate-300" /> Stop on match
          </label>
        </div>
        <div>
          <label className={labelClass}>Add tags (comma-separated)</label>
          <input name="addTags" placeholder="vip, priority" className={inputClass} />
        </div>
      </fieldset>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-green-600">Rule created.</p>}
      <button type="submit" disabled={pending} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
        {pending ? "Creating…" : "Create rule"}
      </button>
    </form>
  );
}
