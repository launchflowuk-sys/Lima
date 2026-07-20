"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/current-user";
import { updateContactNotes } from "@/server/contacts/service";

export async function updateContactNotesAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const contactId = String(formData.get("contactId") ?? "");
  const notes = String(formData.get("notes") ?? "");
  if (!contactId) return;
  await updateContactNotes(user, contactId, notes);
  revalidatePath("/contacts");
}
