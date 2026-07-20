import { NextResponse } from "next/server";
import { withApiUser } from "@/server/api/http";
import { approveAndSendDraft } from "@/server/approvals/service";

/** Approve & send a draft from the app. Optional { finalBody } edits before sending. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const finalBody = typeof body?.finalBody === "string" ? body.finalBody : undefined;
  return withApiUser(req, async (user) => {
    const result = await approveAndSendDraft(user, id, finalBody);
    return NextResponse.json({ ok: true, ...result });
  });
}
