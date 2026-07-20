import { NextResponse } from "next/server";
import { withApiUser } from "@/server/api/http";
import { listPendingDrafts } from "@/server/approvals/service";

export async function GET(req: Request) {
  return withApiUser(req, async (user) => NextResponse.json({ drafts: await listPendingDrafts(user) }));
}
