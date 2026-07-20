import { getSessionUserId } from "./session";
import { loadAuthUser } from "./current-user";
import type { AuthUser } from "./access";

/** Extract a Bearer token from the Authorization header (mobile / API clients). */
export function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  return header.slice(7).trim() || null;
}

/** Resolve the AuthUser from a Bearer token, or null. The mobile-app equivalent of getCurrentUser. */
export async function getUserFromRequest(req: Request): Promise<AuthUser | null> {
  const token = bearerToken(req);
  if (!token) return null;
  const userId = await getSessionUserId(token);
  if (!userId) return null;
  return loadAuthUser(userId);
}
