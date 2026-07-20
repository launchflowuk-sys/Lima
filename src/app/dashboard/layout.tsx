import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/server/auth/current-user";
import { SignOutButton } from "./sign-out-button";

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

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Server-side auth gate. The middleware bounces cookieless requests; this validates the session
  // (expiry, active user) and gives the layout the real user.
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

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
          <div className="border-t border-slate-200 p-3">
            <p className="px-3 pb-1 text-xs font-medium text-slate-900 truncate">{displayName}</p>
            <p className="px-3 pb-2 text-xs text-slate-400">{user.isOwner ? "Owner" : `${user.access.length} business${user.access.length === 1 ? "" : "es"}`}</p>
            <SignOutButton />
          </div>
        </aside>
        <main className="flex-1 md:pl-60">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
