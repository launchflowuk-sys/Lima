import { NextResponse } from "next/server";
import { withApiUser, jsonError } from "@/server/api/http";
import { env } from "@/env";
import { generateDraftForThread } from "@/server/drafts/service";

/**
 * On-demand draft generation for one thread — powers the mobile "Generate AI reply" button. Generates
 * (or regenerates) a reply via the drafts service and returns the created draft. Permission-checked
 * (`reply.edit`) inside the service. 503 if no AI provider is configured.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withApiUser(req, async (user) => {
    if (!env.OPENAI_API_KEY) return jsonError(503, "AI is not configured");
    const draft = await generateDraftForThread(user, id);
    return NextResponse.json({
      draft: {
        id: draft.id,
        bodyText: draft.bodyText,
        status: draft.status,
        autoSendBlockedReason: draft.autoSendBlockedReason,
      },
    });
  });
}
