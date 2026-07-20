import { NextResponse } from "next/server";
import { withApiUser } from "@/server/api/http";
import { listThreadsForUser } from "@/server/inbox/service";

export async function GET(req: Request) {
  return withApiUser(req, async (user) => NextResponse.json({ threads: await listThreadsForUser(user) }));
}
