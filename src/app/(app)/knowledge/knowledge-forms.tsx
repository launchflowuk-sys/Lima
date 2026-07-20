"use client";

import { useActionState, useEffect, useRef } from "react";
import { createEntryAction, addDocumentAction, type ActionState } from "./actions";

type BusinessOption = { id: string; name: string };

const KINDS = ["fact", "faq", "policy", "service", "pricing", "hours", "note"] as const;

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const labelClass = "block text-xs font-medium text-slate-700 mb-1";

function BusinessSelect({ businesses }: { businesses: BusinessOption[] }) {
  return (
    <div>
      <label className={labelClass}>Business</label>
      <select name="businessId" required className={inputClass} defaultValue={businesses[0]?.id ?? ""}>
        {businesses.map((b) => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>
    </div>
  );
}

export function AddEntryForm({ businesses }: { businesses: BusinessOption[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createEntryAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
      <h2 className="text-sm font-semibold text-slate-900">Add an approved fact</h2>
      <p className="text-xs text-slate-500">
        Only facts you add here can be used in AI replies. Nothing is invented. Set a higher priority for
        core facts (opening hours, key services) so they&rsquo;re always considered.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <BusinessSelect businesses={businesses} />
        <div>
          <label className={labelClass}>Type</label>
          <select name="kind" className={inputClass} defaultValue="fact">
            {KINDS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass}>Title</label>
        <input name="title" required placeholder="Opening hours" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Content</label>
        <textarea name="content" required rows={4} placeholder="We are open Monday to Friday, 9am–6pm. Closed on bank holidays." className={inputClass} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Tags (comma-separated, optional)</label>
          <input name="tags" placeholder="hours, availability" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Priority (0–10)</label>
          <input name="priority" type="number" min={0} max={10} defaultValue={0} className={inputClass} />
        </div>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-green-600">Fact added.</p>}
      <button type="submit" disabled={pending} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
        {pending ? "Adding…" : "Add fact"}
      </button>
    </form>
  );
}

export function AddDocumentForm({ businesses }: { businesses: BusinessOption[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(addDocumentAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
      <h2 className="text-sm font-semibold text-slate-900">Paste a document</h2>
      <p className="text-xs text-slate-500">
        Paste a price list, FAQ, policy, or service description. It&rsquo;s split into searchable chunks the
        AI can draw on. (File upload &amp; PDF extraction come with the storage phase.)
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <BusinessSelect businesses={businesses} />
        <div>
          <label className={labelClass}>Title</label>
          <input name="title" required placeholder="2026 price list" className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Document text</label>
        <textarea name="rawText" required rows={6} placeholder="Paste the full text here…" className={inputClass} />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-green-600">Document added and processed.</p>}
      <button type="submit" disabled={pending} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
        {pending ? "Processing…" : "Add document"}
      </button>
    </form>
  );
}
