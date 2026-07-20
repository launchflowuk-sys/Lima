import { NextResponse } from "next/server";
import { withApiUser } from "@/server/api/http";
import { getDashboardStats, getAnalytics } from "@/server/analytics/service";

/** GET /api/v1/analytics — dashboard KPIs + a 30-day report for the app's home screen. */
export async function GET(req: Request) {
  return withApiUser(req, async (user) => {
    const [stats, report] = await Promise.all([getDashboardStats(user), getAnalytics(user, 30)]);
    return NextResponse.json({ stats, report });
  });
}
