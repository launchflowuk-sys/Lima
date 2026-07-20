"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/current-user";
import { approveAndSendDraft, rejectDraft } from "@/server/approvals/service";

export async function approveDraftAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const draftId = String(formData.get("draftId") ?? "");
  const finalBody = formData.get("finalBody");
  if (!draftId) return;
  await approveAndSendDraft(user, draftId, typeof finalBody === "string" ? finalBody : undefined);
  revalidatePath("/approvals");
  revalidatePath("/inbox");
}

export async function rejectDraftAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const draftId = String(formData.get("draftId") ?? "");
  if (!draftId) return;
  await rejectDraft(user, draftId);
  revalidatePath("/approvals");
}
