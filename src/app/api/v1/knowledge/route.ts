import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiUser, jsonError } from "@/server/api/http";
import { listKnowledgeOverview, createKnowledgeEntry } from "@/server/knowledge/service";

/** GET /api/v1/knowledge — the businesses the caller can see plus their knowledge entries. */
export async function GET(req: Request) {
  return withApiUser(req, async (user) => {
    const { businesses, entries } = await listKnowledgeOverview(user);
    return NextResponse.json({
      businesses: businesses.map((b) => ({ id: b.id, name: b.name })),
      entries: entries.map((e) => ({
        id: e.id,
        businessId: e.businessId,
        title: e.title,
        content: e.content,
        kind: e.kind,
        priority: e.priority,
        isActive: e.isActive,
      })),
    });
  });
}

const createSchema = z.object({
  businessId: z.string().uuid(),
  title: z.string().min(1),
  content: z.string().min(1),
  kind: z.enum(["fact", "faq", "policy", "service", "pricing", "hours", "note"]).optional(),
  tags: z.array(z.string()).optional(),
  priority: z.number().int().min(0).max(10).optional(),
});

/** POST /api/v1/knowledge — add an approved fact from the app. Requires knowledge.edit. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  return withApiUser(req, async (user) => {
    const entry = await createKnowledgeEntry(user, parsed.data);
    return NextResponse.json({ ok: true, id: entry.id });
  });
}
