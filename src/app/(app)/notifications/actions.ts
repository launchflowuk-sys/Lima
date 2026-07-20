"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/current-user";
import { markNotificationRead, markAllNotificationsRead } from "@/server/notifications/service";

export async function markReadAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("notificationId") ?? "");
  if (id) {
    await markNotificationRead(user, id);
    revalidatePath("/notifications");
  }
}

export async function markAllReadAction(): Promise<void> {
  const user = await requireUser();
  await markAllNotificationsRead(user);
  revalidatePath("/notifications");
}
