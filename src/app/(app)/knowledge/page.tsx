import { getCurrentUser } from "@/server/auth/current-user";
import { listKnowledgeOverview } from "@/server/knowledge/service";
import { AddEntryForm, AddDocumentForm } from "./knowledge-forms";
import { deleteEntryAction } from "./actions";

const DOC_STATUS_STYLES: Record<string, string> = {
  ready: "bg-green-100 text-green-700",
  processing: "bg-amber-100 text-amber-700",
  pending: "bg-slate-100 text-slate-500",
  failed: "bg-red-100 text-red-700",
};

export default async function KnowledgePage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { businesses, entries, documents } = await listKnowledgeOverview(user);
  const businessName = new Map(businesses.map((b) => [b.id, b.name]));
  const canEdit = businesses.length > 0;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Knowledge base</h1>
        <p className="mt-1 text-sm text-slate-500">
          The approved facts the AI is allowed to use when drafting replies. It never invents prices,
          availability, or promises — if it&rsquo;s not here, it asks instead.
        </p>
      </header>

      {businesses.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <h2 className="text-base font-semibold text-slate-900">Add a business first</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Knowledge is stored per business. Create a business on the Businesses page, then come back to
            add its facts.
          </p>
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Approved facts ({entries.length})</h2>
            {entries.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                No facts yet. Add your first below — the AI can only reply with facts it finds here.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Business</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Priority</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {entries.map((e) => (
                      <tr key={e.id}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{e.title}</div>
                          <div className="mt-0.5 line-clamp-1 max-w-md text-xs text-slate-500">{e.content}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{businessName.get(e.businessId) ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-500">{e.kind}</td>
                        <td className="px-4 py-3 text-slate-500">{e.priority}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${e.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                            {e.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <form action={deleteEntryAction}>
                            <input type="hidden" name="entryId" value={e.id} />
                            <button type="submit" className="text-xs font-medium text-red-600 hover:text-red-500">Delete</button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {documents.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">Documents ({documents.length})</h2>
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Business</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {documents.map((d) => (
                      <tr key={d.id}>
                        <td className="px-4 py-3 font-medium text-slate-900">{d.title}</td>
                        <td className="px-4 py-3 text-slate-500">{businessName.get(d.businessId) ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${DOC_STATUS_STYLES[d.status] ?? "bg-slate-100 text-slate-500"}`}>{d.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {canEdit && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <AddEntryForm businesses={businesses.map((b) => ({ id: b.id, name: b.name }))} />
              <AddDocumentForm businesses={businesses.map((b) => ({ id: b.id, name: b.name }))} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
