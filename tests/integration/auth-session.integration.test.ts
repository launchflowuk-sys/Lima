import { it, expect, vi, beforeEach } from "vitest";
import { describeIntegration, seedOwner } from "./harness";
import { POST as loginRoute } from "@/app/api/auth/login/route";
import { getSessionUserId, SESSION_COOKIE } from "@/server/auth/session";
import { loadAuthUser, getCurrentUser } from "@/server/auth/current-user";

// getCurrentUser reads the session cookie via next/headers. Mock it so we can drive it from a token
// captured in the test (there's no real request scope in a unit process).
const cookieHolder = vi.hoisted(() => ({ token: null as string | null }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === "lima_session" && cookieHolder.token ? { value: cookieHolder.token } : undefined),
  }),
}));

const EMAIL = "owner@example.com";
const PASSWORD = "a-strong-password-123";

function loginRequest(email: string, password: string): Request {
  return new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

function sessionTokenFrom(res: Response): string | undefined {
  // NextResponse sets the cookie; read it back off the Set-Cookie header.
  const setCookie = res.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/lima_session=([^;]+)/);
  return match?.[1];
}

describeIntegration("auth: seed → login → session → authorized access", () => {
  beforeEach(() => {
    cookieHolder.token = null;
  });

  it("issues a session for the seeded owner and resolves the right AuthUser", async () => {
    // Arrange: seed an owner exactly like scripts/seed.ts does.
    const { org, user } = await seedOwner(EMAIL, PASSWORD);

    // Act: log in through the real route handler.
    const res = await loginRoute(loginRequest(EMAIL, PASSWORD));

    // Assert: 200 + a session cookie.
    expect(res.status).toBe(200);
    const token = sessionTokenFrom(res);
    expect(token, "login should set a lima_session cookie").toBeTruthy();

    // The session token resolves to the seeded user, and loadAuthUser rebuilds the right identity.
    const userId = await getSessionUserId(token!);
    expect(userId).toBe(user.id);

    const authUser = await loadAuthUser(user.id);
    expect(authUser).not.toBeNull();
    expect(authUser!.email).toBe(EMAIL);
    expect(authUser!.isOwner).toBe(true);
    expect(authUser!.organisationId).toBe(org.id);
    expect(authUser!.access).toEqual([]); // owners bypass per-business grants
  });

  it("resolves the current user from the session cookie (getCurrentUser path)", async () => {
    const { user } = await seedOwner(EMAIL, PASSWORD);
    const res = await loginRoute(loginRequest(EMAIL, PASSWORD));
    cookieHolder.token = sessionTokenFrom(res) ?? null;

    const current = await getCurrentUser();
    expect(current).not.toBeNull();
    expect(current!.id).toBe(user.id);
    expect(current!.isOwner).toBe(true);
  });

  it("rejects a wrong password with 401 and issues no session", async () => {
    await seedOwner(EMAIL, PASSWORD);
    const res = await loginRoute(loginRequest(EMAIL, "wrong-password"));
    expect(res.status).toBe(401);
    expect(sessionTokenFrom(res)).toBeUndefined();
  });

  it("rejects an unknown email with the same generic 401 (no account enumeration)", async () => {
    await seedOwner(EMAIL, PASSWORD);
    const res = await loginRoute(loginRequest("nobody@example.com", PASSWORD));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Invalid email or password");
  });
});
