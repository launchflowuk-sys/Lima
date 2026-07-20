"use client";

import { useRef } from "react";

const OPTIONS: Array<{ value: string; label: string }> = [
  { value: "draft_only", label: "Draft only" },
  { value: "controlled_auto_send", label: "Controlled auto-send" },
  { value: "disabled", label: "Disabled" },
];

/**
 * Inline autonomy switcher. Submits the surrounding form on change so changing the mode is a single
 * action. Auto-send only ever happens for a mailbox set to "Controlled auto-send" — and even then each
 * reply must still clear the safety policy and match an automation rule.
 */
export function AutonomySelect({
  mailboxId,
  value,
  action,
}: {
  mailboxId: string;
  value: string;
  action: (formData: FormData) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={action}>
      <input type="hidden" name="mailboxId" value={mailboxId} />
      <select
        name="mode"
        defaultValue={value}
        onChange={() => formRef.current?.requestSubmit()}
        className="rounded-lg border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </form>
  );
}
