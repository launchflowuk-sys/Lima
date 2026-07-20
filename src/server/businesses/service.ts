import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db/client";
import { businesses } from "@/server/db/schema";
import { type AuthUser, ForbiddenError, accessibleBusinessIds, assertBusinessAccess, assertPermission } from "@/server/auth/access";
import { recordAudit } from "@/server/audit/log";

export type Business = typeof businesses.$inferSelect;

/** Businesses the user may see — scoped to their org and their granted business ids. */
export async function listBusinessesForUser(user: AuthUser): Promise<Business[]> {
  const ids = accessibleBusinessIds(user);
  if (ids !== "all" && ids.length === 0) return [];
  return db
    .select()
    .from(businesses)
    .where(
      and(
        eq(businesses.organisationId, user.organisationId),
        ids === "all" ? undefined : inArray(businesses.id, ids),
      ),
    )
    .orderBy(businesses.name);
}

/** Create a business. Org-level action → owners only. */
export async function createBusiness(user: AuthUser, input: { name: string; slug: string }): Promise<Business> {
  if (!user.isOwner) throw new ForbiddenError("Only owners can create businesses");
  const [row] = await db
    .insert(businesses)
    .values({ organisationId: user.organisationId, name: input.name.trim(), slug: input.slug.trim() })
    .returning();
  await recordAudit({
    businessId: row.id,
    actorUserId: user.id,
    action: "business.created",
    entityType: "business",
    entityId: row.id,
    metadata: { name: row.name, slug: row.slug },
  });
  return row;
}

/** Update a business's reply tone + signature (used across every AI draft). Requires `business.manage`. */
export async function updateBusinessSettings(
  user: AuthUser,
  businessId: string,
  input: { replyTone?: string | null; emailSignature?: string | null },
): Promise<Business> {
  assertBusinessAccess(user, businessId);
  assertPermission(user, businessId, "business.manage");
  const [row] = await db
    .update(businesses)
    .set({
      replyTone: input.replyTone?.trim() || null,
      emailSignature: input.emailSignature?.trim() || null,
    })
    .where(eq(businesses.id, businessId))
    .returning();
  if (!row) throw new Error("Business not found");
  await recordAudit({ businessId, actorUserId: user.id, action: "business.settings_updated", entityType: "business", entityId: businessId });
  return row;
}
