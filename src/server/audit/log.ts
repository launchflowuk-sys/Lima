import { db } from "@/server/db/client";
import { auditLogs } from "@/server/db/schema";

/** Append one immutable audit record (spec §26). Never updated/deleted through the app. */
export async function recordAudit(entry: {
  businessId?: string | null;
  actorUserId?: string | null;
  actorType?: "user" | "automation" | "system";
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(auditLogs).values({
    businessId: entry.businessId ?? null,
    actorUserId: entry.actorUserId ?? null,
    actorType: entry.actorType ?? "user",
    action: entry.action,
    entityType: entry.entityType ?? null,
    entityId: entry.entityId ?? null,
    metadata: entry.metadata ?? null,
  });
}
