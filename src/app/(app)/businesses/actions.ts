"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/auth/current-user";
import { createBusiness } from "@/server/businesses/service";

export interface ActionState {
  ok?: boolean;
  error?: string;
}

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug: lowercase letters, numbers and dashes only"),
});

export async function createBusinessAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = schema.safeParse({ name: formData.get("name"), slug: formData.get("slug") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    await createBusiness(user, parsed.data);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create business" };
  }
  revalidatePath("/businesses");
  return { ok: true };
}
