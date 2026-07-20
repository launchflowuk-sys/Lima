"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/auth/current-user";
import {
  createKnowledgeEntry,
  deleteKnowledgeEntry,
  addKnowledgeDocument,
} from "@/server/knowledge/service";

export interface ActionState {
  ok?: boolean;
  error?: string;
}

const entrySchema = z.object({
  businessId: z.string().uuid("Choose a business"),
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  kind: z.enum(["fact", "faq", "policy", "service", "pricing", "hours", "note"]).default("fact"),
  tags: z.string().optional(),
  priority: z.coerce.number().int().min(0).max(10).default(0),
});

export async function createEntryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = entrySchema.safeParse({
    businessId: formData.get("businessId"),
    title: formData.get("title"),
    content: formData.get("content"),
    kind: formData.get("kind") || "fact",
    tags: formData.get("tags") || undefined,
    priority: formData.get("priority") || 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const tags = parsed.data.tags
    ? parsed.data.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];
  try {
    await createKnowledgeEntry(user, {
      businessId: parsed.data.businessId,
      title: parsed.data.title,
      content: parsed.data.content,
      kind: parsed.data.kind,
      tags,
      priority: parsed.data.priority,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to add knowledge" };
  }
  revalidatePath("/knowledge");
  return { ok: true };
}

const documentSchema = z.object({
  businessId: z.string().uuid("Choose a business"),
  title: z.string().min(1, "Title is required"),
  rawText: z.string().min(1, "Document text is required"),
});

export async function addDocumentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = documentSchema.safeParse({
    businessId: formData.get("businessId"),
    title: formData.get("title"),
    rawText: formData.get("rawText"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    await addKnowledgeDocument(user, parsed.data);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to add document" };
  }
  revalidatePath("/knowledge");
  return { ok: true };
}

export async function deleteEntryAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const entryId = String(formData.get("entryId") ?? "");
  if (!entryId) return;
  await deleteKnowledgeEntry(user, entryId);
  revalidatePath("/knowledge");
}
