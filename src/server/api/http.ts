import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/server/auth/api-auth";
import { ForbiddenError, type AuthUser } from "@/server/auth/access";

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Wrap an API route handler with Bearer auth + consistent error mapping. Every /api/v1 route uses
 * this so the mobile app (and any client) gets uniform 401/403/400 JSON. Business logic stays in the
 * services layer; these routes are thin.
 */
export async function withApiUser(
  req: Request,
  handler: (user: AuthUser) => Promise<NextResponse> | NextResponse,
): Promise<NextResponse> {
  const user = await getUserFromRequest(req);
  if (!user) return jsonError(401, "Unauthorized");
  try {
    return await handler(user);
  } catch (e) {
    if (e instanceof ForbiddenError) return jsonError(403, e.message);
    return jsonError(400, e instanceof Error ? e.message : "Request failed");
  }
}
