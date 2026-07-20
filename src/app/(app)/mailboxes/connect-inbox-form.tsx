"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { connectImapAction, type ConnectState } from "./actions";

const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export function ConnectInboxForm({ businesses }: { businesses: Array<{ id: string; name: string }> }) {
  const [state, action, pending] = useActionState<ConnectState, FormData>(connectImapAction, {});
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && !state.warning) {
      formRef.current?.reset();
      setOpen(false);
    }
  }, [state.ok, state.warning]);

  if (businesses.length === 0) {
    return <p className="text-sm text-slate-500">Create a business first, then connect an inbox to it.</p>;
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500">
        Connect an IMAP/SMTP inbox
      </button>
    );
  }

  return (
    <form ref={formRef} action={action} className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Connect an IMAP/SMTP inbox</h2>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-slate-400 hover:text-slate-600">Cancel</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Business</label>
          <select name="businessId" required className={inputCls} defaultValue={businesses[0]?.id}>
            {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Email address</label>
          <input name="emailAddress" type="email" required placeholder="info@yourdomain.co.uk" className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-700 mb-1">Display name (optional)</label>
          <input name="displayName" placeholder="AMO Services" className={inputCls} />
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wide text-slate-400">Incoming (IMAP)</legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2"><input name="imapHost" required placeholder="imap.yourhost.com" className={inputCls} /></div>
          <div><input name="imapPort" type="number" required defaultValue={993} placeholder="993" className={inputCls} /></div>
          <div><input name="imapUsername" required placeholder="username" className={inputCls} /></div>
          <div><input name="imapPassword" type="password" required placeholder="password" className={inputCls} /></div>
          <label className="flex items-center gap-2 text-sm text-slate-600"><input name="imapSecure" type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300" /> Use SSL/TLS</label>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wide text-slate-400">Outgoing (SMTP)</legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2"><input name="smtpHost" required placeholder="smtp.yourhost.com" className={inputCls} /></div>
          <div><input name="smtpPort" type="number" required defaultValue={465} placeholder="465" className={inputCls} /></div>
          <div><input name="smtpUsername" required placeholder="username" className={inputCls} /></div>
          <div><input name="smtpPassword" type="password" required placeholder="password" className={inputCls} /></div>
          <label className="flex items-center gap-2 text-sm text-slate-600"><input name="smtpSecure" type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300" /> Use SSL/TLS</label>
        </div>
      </fieldset>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.warning && <p className="text-sm text-amber-600">{state.warning}</p>}

      <button type="submit" disabled={pending} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
        {pending ? "Verifying…" : "Connect & verify"}
      </button>
      <p className="text-xs text-slate-400">We encrypt your password before storing it and test the connection immediately.</p>
    </form>
  );
}
