import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { contacts } from "@/server/db/schema";
import { type AuthUser, assertBusinessAccess, assertPermission } from "@/server/auth/access";
import { listBusinessesForUser, type Business } from "@/server/businesses/service";
import { recordAudit } from "@/server/audit/log";

export type Contact = typeof contacts.$inferSelect;

/**
 * Record that a contact just emailed us — the customer-memory upsert (spec §17). Called from the
 * ingest path (no user; system). Atomic upsert on (business, email): bumps the message count, advances
 * lastSeenAt, fills firstSeenAt/name if missing. Never overwrites a human-set name with a blank.
 */
export async function upsertContactFromInbound(params: {
  businessId: string;
  email: string;
  name?: string | null;
  seenAt?: Date | null;
}): Promise<void> {
  const email = params.email.toLowerCase().trim();
  if (!email) return;
  const seenAt = params.seenAt ?? new Date();
  const name = params.name?.trim() || null;

  await db
    .insert(contacts)
    .values({
      businessId: params.businessId,
      email,
      name,
      messageCount: 1,
      firstSeenAt: seenAt,
      lastSeenAt: seenAt,
    })
    .onConflictDoUpdate({
      target: [contacts.businessId, contacts.email],
      set: {
        messageCount: sql`${contacts.messageCount} + 1`,
        // Keep the earliest firstSeenAt and the latest lastSeenAt.
        lastSeenAt: sql`GREATEST(${contacts.lastSeenAt}, ${seenAt})`,
        // Only fill the name if we don't already have one.
        name: sql`COALESCE(${contacts.name}, ${name})`,
      },
    });
}

/** Businesses + their contacts, tenant-scoped, for the /contacts page. */
export async function listContactsOverview(user: AuthUser): Promise<{ businesses: Business[]; contacts: Contact[] }> {
  const businesses = await listBusinessesForUser(user);
  const ids = businesses.map((b) => b.id);
  if (ids.length === 0) return { businesses, contacts: [] };
  const rows = await db
    .select()
    .from(contacts)
    .where(inArray(contacts.businessId, ids))
    .orderBy(desc(contacts.lastSeenAt));
  return { businesses, contacts: rows };
}

/** Add/replace the human notes on a contact. Requires `conversation.note`. */
export async function updateContactNotes(user: AuthUser, contactId: string, notes: string): Promise<void> {
  const [contact] = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
  if (!contact) throw new Error("Contact not found");
  assertBusinessAccess(user, contact.businessId);
  assertPermission(user, contact.businessId, "conversation.note");
  await db.update(contacts).set({ notes: notes.trim() || null }).where(eq(contacts.id, contactId));
  await recordAudit({ businessId: contact.businessId, actorUserId: user.id, action: "contact.notes_updated", entityType: "contact", entityId: contactId });
}

/**
 * A short customer-memory string for the AI: how many times they've been in touch plus any human notes.
 * Only ever the given business's contact (tenant isolation). Empty string if unknown/no notes.
 */
export async function getContactContext(businessId: string, email: string | null): Promise<string> {
  if (!email) return "";
  const [contact] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.businessId, businessId), eq(contacts.email, email.toLowerCase().trim())))
    .limit(1);
  if (!contact) return "";
  const bits: string[] = [];
  if (contact.messageCount > 1) bits.push(`Known contact (${contact.messageCount} messages on record).`);
  if (contact.notes) bits.push(`Notes about this customer: ${contact.notes}`);
  return bits.join(" ");
}
