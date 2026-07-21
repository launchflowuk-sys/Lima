"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { SignOutButton } from "./sign-out-button";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "grid" },
  { href: "/inbox", label: "Inbox", icon: "inbox" },
  { href: "/notifications", label: "Notifications", icon: "bell" },
  { href: "/approvals", label: "Approvals", icon: "check" },
  { href: "/follow-ups", label: "Follow-ups", icon: "clock" },
  { href: "/contacts", label: "Contacts", icon: "users" },
  { href: "/businesses", label: "Businesses", icon: "briefcase" },
  { href: "/knowledge", label: "Knowledge", icon: "book" },
  { href: "/automation", label: "Automation", icon: "bolt" },
  { href: "/mailboxes", label: "Mailboxes", icon: "mail" },
  { href: "/analytics", label: "Analytics", icon: "chart" },
  { href: "/team", label: "Team", icon: "userplus" },
  { href: "/audit", label: "Audit", icon: "shield" },
  { href: "/system-health", label: "System health", icon: "pulse" },
  { href: "/settings", label: "Settings", icon: "cog" },
];

const PATHS: Record<string, string> = {
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  inbox: "M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",
  bell: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0",
  check: "M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3",
  clock: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6v6l4 2",
  users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  briefcase: "M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16",
  book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z",
  bolt: "M13 2 3 14h9l-1 8 10-12h-9l1-8z",
  mail: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6",
  chart: "M18 20V10M12 20V4M6 20v-6",
  userplus: "M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM20 8v6M23 11h-6",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  pulse: "M22 12h-4l-3 9L9 3l-3 9H2",
  cog: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
};

function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={PATHS[name] ?? ""} />
    </svg>
  );
}

interface AppNavProps {
  displayName: string;
  subtitle: string;
  unread: number;
}

function NavLinks({ pathname, unread, onNavigate }: { pathname: string; unread: number; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Icon name={item.icon} className={active ? "text-blue-600" : "text-slate-400"} />
            <span className="flex-1">{item.label}</span>
            {item.href === "/notifications" && unread > 0 && (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <Image src="/brand/lima-badge.png" alt="Agent Lima" width={30} height={30} priority className="rounded-[8px]" />
      <div className="leading-none">
        <span className="font-bold tracking-tight text-slate-900">Agent</span>
        <span className="ml-1.5 text-sm font-medium text-slate-400">Lima</span>
      </div>
    </div>
  );
}

export function AppNav({ displayName, subtitle, unread }: AppNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 border-r border-slate-200 bg-white z-30">
        <div className="h-16 flex items-center px-5 border-b border-slate-200">
          <Brand />
        </div>
        <NavLinks pathname={pathname} unread={unread} />
        <div className="border-t border-slate-200 p-3">
          <p className="px-3 pb-1 text-xs font-medium text-slate-900 truncate">{displayName}</p>
          <p className="px-3 pb-2 text-xs text-slate-400">{subtitle}</p>
          <SignOutButton />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 inset-x-0 h-14 z-40 flex items-center justify-between px-4 border-b border-slate-200 bg-white/95 backdrop-blur">
        <Brand />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="relative -mr-2 inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
          {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-blue-600" />}
        </button>
      </header>

      {/* Mobile drawer + backdrop */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[82%] flex flex-col bg-white shadow-xl">
            <div className="h-14 flex items-center justify-between px-4 border-b border-slate-200">
              <Brand />
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="-mr-2 inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <NavLinks pathname={pathname} unread={unread} onNavigate={() => setOpen(false)} />
            <div className="border-t border-slate-200 p-3">
              <p className="px-3 pb-1 text-xs font-medium text-slate-900 truncate">{displayName}</p>
              <p className="px-3 pb-2 text-xs text-slate-400">{subtitle}</p>
              <SignOutButton />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
