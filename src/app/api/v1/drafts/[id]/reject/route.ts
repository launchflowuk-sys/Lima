import { NextResponse } from "next/server";
import { withApiUser } from "@/server/api/http";
import { rejectDraft } from "@/server/approvals/service";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withApiUser(req, async (user) => {
    await rejectDraft(user, id);
    return NextResponse.json({ ok: true });
  });
}
