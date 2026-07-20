import Link from "next/link";
import type { ReactNode } from "react";

/** Primary navigation (spec §5). Rendered server-side; active-state + auth gating come in the auth phase. */
const NAV: Array<{ href: string; label: string }> = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/inbox", label: "Inbox" },
  { href: "/approvals", label: "Approvals" },
  { href: "/follow-ups", label: "Follow-ups" },
  { href: "/contacts", label: "Contacts" },
  { href: "/businesses", label: "Businesses" },
  { href: "/knowledge", label: "Knowledge" },
  { href: "/automation", label: "Automation" },
  { href: "/mailboxes", label: "Mailboxes" },
  { href: "/analytics", label: "Analytics" },
  { href: "/team", label: "Team" },
  { href: "/audit", label: "Audit" },
  { href: "/system-health", label: "System health" },
  { href: "/settings", label: "Settings" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex">
        <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 border-r border-slate-200 bg-white">
          <div className="h-16 flex items-center px-5 border-b border-slate-200">
            <span className="font-bold tracking-tight">LaunchFlow</span>
            <span className="ml-1.5 text-sm font-medium text-slate-400">Inbox</span>
          </div>
          <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex-1 md:pl-60">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
