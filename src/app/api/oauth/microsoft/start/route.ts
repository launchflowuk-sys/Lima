import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/auth/current-user";
import { assertBusinessAccess, assertPermission } from "@/server/auth/access";
import { isMicrosoftConfigured, buildConsentUrl, signOAuthState } from "@/server/email/providers/microsoft-oauth";
import { env } from "@/env";

/**
 * Start the Microsoft OAuth connect flow: authorize the user for the target business, then redirect to
 * Microsoft's consent screen with a signed `state`. `businessId` comes from the query string.
 */
export async function GET(req: Request): Promise<Response> {
  const user = await requireUser();

  const businessId = new URL(req.url).searchParams.get("businessId");
  const parsed = z.string().uuid().safeParse(businessId);
  if (!parsed.success) {
    return NextResponse.redirect(new URL("/mailboxes?error=invalid_business", env.APP_URL));
  }

  assertBusinessAccess(user, parsed.data);
  assertPermission(user, parsed.data, "mailbox.connect");

  if (!isMicrosoftConfigured()) {
    return NextResponse.redirect(new URL("/mailboxes?error=microsoft_not_configured", env.APP_URL));
  }

  const state = await signOAuthState({ businessId: parsed.data, userId: user.id });
  return NextResponse.redirect(buildConsentUrl(state));
}
