import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiUser, jsonError } from "@/server/api/http";
import { listPendingFollowUps, createFollowUp } from "@/server/followups/service";

/** GET /api/v1/follow-ups — pending follow-ups across the caller's businesses, soonest first. */
export async function GET(req: Request) {
  return withApiUser(req, async (user) => {
    const followUps = await listPendingFollowUps(user);
    return NextResponse.json({
      followUps: followUps.map((f) => ({
        id: f.id,
        businessId: f.businessId,
        threadId: f.threadId,
        threadSubject: f.threadSubject,
        dueAt: f.dueAt,
        reason: f.reason,
      })),
    });
  });
}

const createSchema = z.object({
  businessId: z.string().uuid(),
  dueAt: z.string().min(1),
  reason: z.string().min(1),
  threadId: z.string().uuid().optional(),
});

/** POST /api/v1/follow-ups — schedule a follow-up from the app. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  const dueAt = new Date(parsed.data.dueAt);
  if (Number.isNaN(dueAt.getTime())) return jsonError(400, "A valid dueAt is required");
  return withApiUser(req, async (user) => {
    const row = await createFollowUp(user, {
      businessId: parsed.data.businessId,
      dueAt,
      reason: parsed.data.reason,
      threadId: parsed.data.threadId ?? null,
    });
    return NextResponse.json({ ok: true, id: row.id });
  });
}
