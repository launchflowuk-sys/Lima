import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiUser, jsonError } from "@/server/api/http";
import { listNotifications, unreadNotificationCount, markNotificationRead, markAllNotificationsRead } from "@/server/notifications/service";

/** GET /api/v1/notifications — the caller's notifications + unread count. */
export async function GET(req: Request) {
  return withApiUser(req, async (user) => {
    const [items, unread] = await Promise.all([listNotifications(user), unreadNotificationCount(user)]);
    return NextResponse.json({
      unread,
      notifications: items.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        linkPath: n.linkPath,
        isRead: n.isRead,
        createdAt: n.createdAt,
      })),
    });
  });
}

const markSchema = z.object({ id: z.string().uuid().optional(), all: z.boolean().optional() });

/** POST /api/v1/notifications — mark one ({id}) or all ({all:true}) as read. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = markSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, "Invalid input");
  return withApiUser(req, async (user) => {
    if (parsed.data.all) await markAllNotificationsRead(user);
    else if (parsed.data.id) await markNotificationRead(user, parsed.data.id);
    return NextResponse.json({ ok: true });
  });
}
