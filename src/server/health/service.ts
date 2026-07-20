import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db/client";
import { mailboxes, mailboxSyncStates, emailThreads, replyDrafts } from "@/server/db/schema";
import { type AuthUser } from "@/server/auth/access";
import { listBusinessesForUser } from "@/server/businesses/service";

export interface MailboxHealth {
  id: string;
  email: string;
  provider: string;
  status: string;
  lastSyncedAt: Date | null;
  lastError: string | null;
}

export interface HealthSnapshot {
  mailboxes: MailboxHealth[];
  threadCount: number;
  pendingDrafts: number;
}

/** Operational snapshot across the user's businesses (mailbox status, last sync, queue-ish counts). */
export async function getHealthSnapshot(user: AuthUser): Promise<HealthSnapshot> {
  const businesses = await listBusinessesForUser(user);
  const ids = businesses.map((b) => b.id);
  if (!ids.length) return { mailboxes: [], threadCount: 0, pendingDrafts: 0 };

  const boxes = await db.select().from(mailboxes).where(inArray(mailboxes.businessId, ids));
  const syncStates = boxes.length
    ? await db.select().from(mailboxSyncStates).where(inArray(mailboxSyncStates.mailboxId, boxes.map((b) => b.id)))
    : [];
  const syncByBox = new Map(syncStates.map((s) => [s.mailboxId, s]));

  const [threadCount, pendingDrafts] = await Promise.all([
    db.$count(emailThreads, inArray(emailThreads.businessId, ids)),
    db.$count(replyDrafts, and(inArray(replyDrafts.businessId, ids), eq(replyDrafts.status, "pending_approval"))),
  ]);

  return {
    mailboxes: boxes.map((b) => ({
      id: b.id,
      email: b.emailAddress,
      provider: b.provider,
      status: b.status,
      lastSyncedAt: syncByBox.get(b.id)?.lastSyncedAt ?? null,
      lastError: syncByBox.get(b.id)?.lastError ?? null,
    })),
    threadCount,
    pendingDrafts,
  };
}
