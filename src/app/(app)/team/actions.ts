"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/auth/current-user";
import { createInvitation, revokeInvitation, grantBusinessAccess, revokeBusinessAccess } from "@/server/team/service";

export interface InviteState {
  ok?: boolean;
  error?: string;
  link?: string;
}

const roleEnum = z.enum(["owner", "manager", "agent", "read_only"]);

const inviteSchema = z.object({
  email: z.string().email("Enter a valid email"),
  role: roleEnum,
});

export async function inviteAction(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const user = await requireUser();
  const parsed = inviteSchema.safeParse({ email: formData.get("email"), role: formData.get("role") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    const { link } = await createInvitation(user, parsed.data);
    revalidatePath("/team");
    return { ok: true, link };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create invitation" };
  }
}

export async function revokeInviteAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("invitationId") ?? "");
  if (id) {
    await revokeInvitation(user, id);
    revalidatePath("/team");
  }
}

export async function grantAccessAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const userId = String(formData.get("userId") ?? "");
  const businessId = String(formData.get("businessId") ?? "");
  const role = String(formData.get("role") ?? "");
  const parsed = roleEnum.safeParse(role);
  if (!userId || !businessId || !parsed.success) return;
  await grantBusinessAccess(user, { userId, businessId, role: parsed.data });
  revalidatePath("/team");
}

export async function revokeAccessAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const userId = String(formData.get("userId") ?? "");
  const businessId = String(formData.get("businessId") ?? "");
  if (!userId || !businessId) return;
  await revokeBusinessAccess(user, { userId, businessId });
  revalidatePath("/team");
}
