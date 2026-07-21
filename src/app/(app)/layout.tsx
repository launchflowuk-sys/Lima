import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/server/auth/current-user";
import { unreadNotificationCount } from "@/server/notifications/service";
import { AppNav } from "./app-nav";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Server-side auth gate. The middleware bounces cookieless requests; this validates the session
  // (expiry, active user) and gives the layout the real user.
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
  const subtitle = user.isOwner ? "Owner" : `${user.access.length} business${user.access.length === 1 ? "" : "es"}`;
  const unread = await unreadNotificationCount(user);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppNav displayName={displayName} subtitle={subtitle} unread={unread} />
      <main className="md:pl-60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-10 md:pt-8">{children}</div>
      </main>
    </div>
  );
}
