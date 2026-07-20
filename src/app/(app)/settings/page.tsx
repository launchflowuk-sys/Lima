import { getCurrentUser } from "@/server/auth/current-user";
import { listBusinessesForUser } from "@/server/businesses/service";
import { BusinessSettingsForm } from "./business-settings-form";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const businesses = await listBusinessesForUser(user);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Per-business reply tone and signature used by every AI draft.</p>
      </header>

      {businesses.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <h2 className="text-base font-semibold text-slate-900">No businesses yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Create a business first, then configure its tone and signature here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {businesses.map((b) => (
            <BusinessSettingsForm key={b.id} business={{ id: b.id, name: b.name, replyTone: b.replyTone, emailSignature: b.emailSignature }} />
          ))}
        </div>
      )}
    </div>
  );
}
