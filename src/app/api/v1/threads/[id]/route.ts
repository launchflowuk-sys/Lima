import { NextResponse } from "next/server";
import { withApiUser, jsonError } from "@/server/api/http";
import { getThreadForUser } from "@/server/inbox/service";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withApiUser(req, async (user) => {
    const data = await getThreadForUser(user, id);
    if (!data) return jsonError(404, "Thread not found");
    return NextResponse.json(data);
  });
}
