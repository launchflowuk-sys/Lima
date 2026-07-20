"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/auth/current-user";
import { createFollowUp, completeFollowUp, cancelFollowUp } from "@/server/followups/service";

export interface ActionState {
  ok?: boolean;
  error?: string;
}

const schema = z.object({
  businessId: z.string().uuid("Choose a business"),
  dueAt: z.string().min(1, "A due date is required"),
  reason: z.string().min(1, "A reason is required"),
  threadId: z.string().uuid().optional().or(z.literal("")),
});

export async function createFollowUpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = schema.safeParse({
    businessId: formData.get("businessId"),
    dueAt: formData.get("dueAt"),
    reason: formData.get("reason"),
    threadId: formData.get("threadId") || "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const dueAt = new Date(parsed.data.dueAt);
  if (Number.isNaN(dueAt.getTime())) return { error: "A valid due date is required" };
  try {
    await createFollowUp(user, {
      businessId: parsed.data.businessId,
      dueAt,
      reason: parsed.data.reason,
      threadId: parsed.data.threadId || null,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create follow-up" };
  }
  revalidatePath("/follow-ups");
  return { ok: true };
}

export async function completeFollowUpAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("followUpId") ?? "");
  if (id) {
    await completeFollowUp(user, id);
    revalidatePath("/follow-ups");
  }
}

export async function cancelFollowUpAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("followUpId") ?? "");
  if (id) {
    await cancelFollowUp(user, id);
    revalidatePath("/follow-ups");
  }
}
