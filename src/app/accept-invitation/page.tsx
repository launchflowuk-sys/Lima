import Link from "next/link";
import { findInvitationByToken } from "@/server/team/service";
import { AcceptForm } from "./accept-form";

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const invite = token ? await findInvitationByToken(token) : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <span className="font-bold tracking-tight">Agent</span>
          <span className="ml-1.5 text-sm font-medium text-slate-400">Lima</span>
        </div>

        {!invite ? (
          <div className="space-y-3 text-center">
            <h1 className="text-lg font-semibold text-slate-900">Invitation not valid</h1>
            <p className="text-sm text-slate-500">This invitation link is invalid, has expired, or has already been used.</p>
            <Link href="/login" className="inline-block text-sm font-medium text-blue-600 hover:text-blue-500">Go to sign in</Link>
          </div>
        ) : (
          <>
            <h1 className="mb-1 text-lg font-semibold text-slate-900">Accept your invitation</h1>
            <p className="mb-6 text-sm text-slate-500">Set a password to join and start using the inbox.</p>
            <AcceptForm token={token as string} email={invite.email} />
          </>
        )}
      </div>
    </div>
  );
}
