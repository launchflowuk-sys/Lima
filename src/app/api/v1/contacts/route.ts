import { NextResponse } from "next/server";
import { withApiUser } from "@/server/api/http";
import { listContactsOverview } from "@/server/contacts/service";

/** GET /api/v1/contacts — the caller's businesses plus their contacts (customer memory). */
export async function GET(req: Request) {
  return withApiUser(req, async (user) => {
    const { businesses, contacts } = await listContactsOverview(user);
    return NextResponse.json({
      businesses: businesses.map((b) => ({ id: b.id, name: b.name })),
      contacts: contacts.map((c) => ({
        id: c.id,
        businessId: c.businessId,
        email: c.email,
        name: c.name,
        messageCount: c.messageCount,
        notes: c.notes,
        lastSeenAt: c.lastSeenAt,
      })),
    });
  });
}
