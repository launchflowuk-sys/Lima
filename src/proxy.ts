import { NextResponse, type NextRequest } from "next/server";

// Cookie name is duplicated from auth/session.ts on purpose: this runs on the edge runtime and must
// not import that module (it pulls in the Node-only db client). Keep the two in sync.
const SESSION_COOKIE = "lima_session";

// Paths reachable without a session. Everything else requires the cookie to be present; full
// validation (expiry, active user) still happens server-side via getCurrentUser.
const PUBLIC_PREFIXES = ["/login", "/forgot-password", "/reset-password", "/accept-invitation", "/api/auth"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (isPublic) return NextResponse.next();

  if (!req.cookies.has(SESSION_COOKIE)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

// Run on everything except Next internals, static assets, and files with an extension.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
