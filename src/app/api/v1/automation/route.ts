import { NextResponse } from "next/server";
import { withApiUser } from "@/server/api/http";
import { listRulesOverview } from "@/server/automation/service";

/** GET /api/v1/automation — the caller's businesses plus their automation rules (read-only for now). */
export async function GET(req: Request) {
  return withApiUser(req, async (user) => {
    const { businesses, rules } = await listRulesOverview(user);
    return NextResponse.json({
      businesses: businesses.map((b) => ({ id: b.id, name: b.name })),
      rules: rules.map((r) => ({
        id: r.id,
        businessId: r.businessId,
        name: r.name,
        priority: r.priority,
        isActive: r.isActive,
        conditions: r.conditions,
        actions: r.actions,
        stopOnMatch: r.stopOnMatch,
      })),
    });
  });
}
