import { getCurrentUser } from "@/server/auth/current-user";
import { listBusinessesForUser } from "@/server/businesses/service";
import { CreateBusinessForm } from "./create-business-form";

export default async function BusinessesPage() {
  const user = await getCurrentUser();
  if (!user) return null; // layout already redirects; this narrows the type
  const businesses = await listBusinessesForUser(user);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Businesses</h1>
        <p className="mt-1 text-sm text-slate-500">Each business has its own inboxes, knowledge and rules.</p>
      </header>

      {businesses.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <h2 className="text-base font-semibold text-slate-900">No businesses yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Add your first business below to start connecting inboxes.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {businesses.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{b.name}</td>
                  <td className="px-4 py-3 text-slate-500">{b.slug}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${b.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                      {b.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {user.isOwner && <CreateBusinessForm />}
    </div>
  );
}
