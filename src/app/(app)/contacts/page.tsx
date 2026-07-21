import { getCurrentUser } from "@/server/auth/current-user";
import { listContactsOverview } from "@/server/contacts/service";
import { updateContactNotesAction } from "./actions";

function fmt(date: Date | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function ContactsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { businesses, contacts } = await listContactsOverview(user);
  const businessName = new Map(businesses.map((b) => [b.id, b.name]));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Contacts</h1>
        <p className="mt-1 text-sm text-slate-500">
          Everyone who&rsquo;s emailed your businesses, built automatically as mail arrives. Notes you add here
          become approved context the AI can use when replying to that customer.
        </p>
      </header>

      {contacts.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <h2 className="text-base font-semibold text-slate-900">No contacts yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Contacts appear here once a mailbox syncs inbound mail. Connect an inbox and run a sync to populate this list.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
              <tr>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Messages</th>
                <th className="px-4 py-3">Last seen</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contacts.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{c.name ?? c.email}</div>
                    {c.name && <div className="text-xs text-slate-500">{c.email}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{businessName.get(c.businessId) ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{c.messageCount}</td>
                  <td className="px-4 py-3 text-slate-500">{fmt(c.lastSeenAt)}</td>
                  <td className="px-4 py-3">
                    <form action={updateContactNotesAction} className="flex items-center gap-2">
                      <input type="hidden" name="contactId" value={c.id} />
                      <input
                        name="notes"
                        defaultValue={c.notes ?? ""}
                        placeholder="Add a note…"
                        className="w-56 rounded-lg border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button type="submit" className="text-xs font-medium text-blue-600 hover:text-blue-500">Save</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
