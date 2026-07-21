import { NextResponse } from "next/server";
import { env } from "@/env";
import { logger } from "@/server/logger";
import { loadAuthUser } from "@/server/auth/current-user";
import { verifyOAuthState, exchangeCodeForTokens, fetchGoogleAccountEmail } from "@/server/email/providers/gmail-oauth";
import { connectGmailMailbox } from "@/server/mailboxes/gmail-service";

/**
 * OAuth callback: Google redirects here with `code` + `state` (or `error`). We verify the signed
 * state, exchange the code for tokens, resolve the account email, and persist the mailbox. Every
 * failure funnels the user back to /mailboxes with an error flag — no token material ever leaks.
 */
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const errorParam = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const redirect = (query: string): Response => NextResponse.redirect(new URL(`/mailboxes${query}`, env.APP_URL));

  if (errorParam) return redirect(`?error=${encodeURIComponent(errorParam)}`);
  if (!code || !state) return redirect("?error=gmail_missing_code");

  try {
    const { businessId, userId } = await verifyOAuthState(state);

    const user = await loadAuthUser(userId);
    if (!user) return redirect("?error=gmail_connect_failed");

    const tokens = await exchangeCodeForTokens(code);
    const emailAddress = await fetchGoogleAccountEmail(tokens);

    await connectGmailMailbox({ user, businessId, emailAddress, tokens });
    return redirect("?connected=gmail");
  } catch (err) {
    logger.warn({ err }, "Gmail OAuth callback failed");
    return redirect("?error=gmail_connect_failed");
  }
}
