import { NextResponse } from "next/server";
import { withApiUser } from "@/server/api/http";

export async function GET(req: Request) {
  return withApiUser(req, (user) => NextResponse.json({ user }));
}
