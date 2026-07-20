"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/auth/current-user";
import { updateBusinessSettings } from "@/server/businesses/service";

export interface ActionState {
  ok?: boolean;
  error?: string;
}

const schema = z.object({
  businessId: z.string().uuid(),
  replyTone: z.string().optional(),
  emailSignature: z.string().optional(),
});

export async function updateSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = schema.safeParse({
    businessId: formData.get("businessId"),
    replyTone: formData.get("replyTone") ?? "",
    emailSignature: formData.get("emailSignature") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    await updateBusinessSettings(user, parsed.data.businessId, {
      replyTone: parsed.data.replyTone,
      emailSignature: parsed.data.emailSignature,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save settings" };
  }
  revalidatePath("/settings");
  return { ok: true };
}
