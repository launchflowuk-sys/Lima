"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/auth/current-user";
import { createRule, setRuleActive, deleteRule } from "@/server/automation/service";
import type { RuleConditions, RuleActions } from "@/server/automation/types";

export interface ActionState {
  ok?: boolean;
  error?: string;
}

/** Split a comma/newline list into trimmed, non-empty tokens. */
function list(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const schema = z.object({
  businessId: z.string().uuid("Choose a business"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  priority: z.coerce.number().int().min(0).max(1000).default(100),
});

export async function createRuleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = schema.safeParse({
    businessId: formData.get("businessId"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    priority: formData.get("priority") || 100,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const conditions: RuleConditions = {};
  const intents = list(formData.get("intents"));
  if (intents.length) conditions.intents = intents;
  const excludeIntents = list(formData.get("excludeIntents"));
  if (excludeIntents.length) conditions.excludeIntents = excludeIntents;
  const fromContains = list(formData.get("fromContains"));
  if (fromContains.length) conditions.fromContains = fromContains;
  const subjectContains = list(formData.get("subjectContains"));
  if (subjectContains.length) conditions.subjectContains = subjectContains;
  const maxRisk = String(formData.get("maxRiskLevel") ?? "");
  if (maxRisk === "low" || maxRisk === "medium" || maxRisk === "high" || maxRisk === "prohibited_auto_send") {
    conditions.maxRiskLevel = maxRisk;
  }

  const actions: RuleActions = {};
  if (formData.get("autoSend")) actions.autoSend = true;
  if (formData.get("holdForApproval")) actions.holdForApproval = true;
  if (formData.get("escalate")) actions.escalate = true;
  const addTags = list(formData.get("addTags"));
  if (addTags.length) actions.addTags = addTags;

  if (Object.keys(actions).length === 0) return { error: "Choose at least one action" };

  try {
    await createRule(user, {
      businessId: parsed.data.businessId,
      name: parsed.data.name,
      description: parsed.data.description,
      priority: parsed.data.priority,
      conditions,
      actions,
      stopOnMatch: Boolean(formData.get("stopOnMatch")),
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create rule" };
  }
  revalidatePath("/automation");
  return { ok: true };
}

export async function toggleRuleAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const ruleId = String(formData.get("ruleId") ?? "");
  const isActive = String(formData.get("isActive") ?? "") === "true";
  if (!ruleId) return;
  await setRuleActive(user, ruleId, !isActive);
  revalidatePath("/automation");
}

export async function deleteRuleAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const ruleId = String(formData.get("ruleId") ?? "");
  if (!ruleId) return;
  await deleteRule(user, ruleId);
  revalidatePath("/automation");
}
