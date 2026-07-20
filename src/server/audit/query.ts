import { desc, inArray } from "drizzle-orm";
import { db } from "@/server/db/client";
import { auditLogs } from "@/server/db/schema";
import { type AuthUser } from "@/server/auth/access";
import { listBusinessesForUser } from "@/server/businesses/service";

export type AuditLog = typeof auditLogs.$inferSelect;

/** Recent audit records across the user's businesses, newest first. Tenant-scoped. */
export async function listRecentAudit(user: AuthUser, limit = 100): Promise<AuditLog[]> {
  const businesses = await listBusinessesForUser(user);
  if (!businesses.length) return [];
  return db
    .select()
    .from(auditLogs)
    .where(inArray(auditLogs.businessId, businesses.map((b) => b.id)))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}
