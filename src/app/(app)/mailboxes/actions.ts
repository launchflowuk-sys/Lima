"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/auth/current-user";
import { connectImapSmtpMailbox, deleteMailbox, syncMailbox, setMailboxAutonomy } from "@/server/mailboxes/service";

export interface ConnectState {
  ok?: boolean;
  error?: string;
  warning?: string;
}

const schema = z.object({
  businessId: z.string().uuid("Choose a business"),
  emailAddress: z.string().email("Enter a valid email address"),
  displayName: z.string().optional(),
  imapHost: z.string().min(1, "IMAP host required"),
  imapPort: z.coerce.number().int().positive(),
  imapSecure: z.coerce.boolean(),
  imapUsername: z.string().min(1, "IMAP username required"),
  imapPassword: z.string().min(1, "IMAP password required"),
  smtpHost: z.string().min(1, "SMTP host required"),
  smtpPort: z.coerce.number().int().positive(),
  smtpSecure: z.coerce.boolean(),
  smtpUsername: z.string().min(1, "SMTP username required"),
  smtpPassword: z.string().min(1, "SMTP password required"),
});

export async function connectImapAction(_prev: ConnectState, formData: FormData): Promise<ConnectState> {
  const user = await requireUser();
  const parsed = schema.safeParse({
    businessId: formData.get("businessId"),
    emailAddress: formData.get("emailAddress"),
    displayName: formData.get("displayName") ?? undefined,
    imapHost: formData.get("imapHost"),
    imapPort: formData.get("imapPort"),
    imapSecure: formData.get("imapSecure"), // "on" | null → boolean
    imapUsername: formData.get("imapUsername"),
    imapPassword: formData.get("imapPassword"),
    smtpHost: formData.get("smtpHost"),
    smtpPort: formData.get("smtpPort"),
    smtpSecure: formData.get("smtpSecure"),
    smtpUsername: formData.get("smtpUsername"),
    smtpPassword: formData.get("smtpPassword"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  try {
    const result = await connectImapSmtpMailbox(user, parsed.data);
    revalidatePath("/mailboxes");
    if (result.status === "error") {
      return { ok: true, warning: `Saved, but the connection check failed: ${result.error}. Check the host/port/credentials.` };
    }
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to connect mailbox" };
  }
}

export async function deleteMailboxAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = formData.get("mailboxId");
  if (typeof id === "string") {
    await deleteMailbox(user, id);
    revalidatePath("/mailboxes");
  }
}

export async function setAutonomyAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("mailboxId") ?? "");
  const mode = String(formData.get("mode") ?? "");
  if (!id || (mode !== "draft_only" && mode !== "controlled_auto_send" && mode !== "disabled")) return;
  await setMailboxAutonomy(user, id, mode);
  revalidatePath("/mailboxes");
}

export async function syncMailboxAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = formData.get("mailboxId");
  if (typeof id === "string") {
    await syncMailbox(user, id);
    revalidatePath("/mailboxes");
    revalidatePath("/inbox");
  }
}
