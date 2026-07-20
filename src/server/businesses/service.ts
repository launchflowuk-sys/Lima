import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db/client";
import { businesses } from "@/server/db/schema";
import { type AuthUser, ForbiddenError, accessibleBusinessIds } from "@/server/auth/access";
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
