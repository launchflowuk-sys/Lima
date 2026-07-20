"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/current-user";
import { generateDraftForThread } from "@/server/drafts/service";

export async function generateDraftAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const threadId = String(formData.get("threadId") ?? "");
  if (!threadId) return;
  await generateDraftForThread(user, threadId);
  revalidatePath("/approvals");
  redirect("/approvals");
}
