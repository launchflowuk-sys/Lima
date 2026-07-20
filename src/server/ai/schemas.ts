import { z } from "zod";
import { intentEnum, urgencyEnum, sentimentEnum, riskLevelEnum } from "@/server/db/schema";

/**
 * Structured classification output (spec §11). The enums are derived from the DB pgEnums
 * (`.enumValues`) so the AI contract and the database can never drift apart.
 */
export const IntentSchema = z.enum(intentEnum.enumValues);
export const UrgencySchema = z.enum(urgencyEnum.enumValues);
export const SentimentSchema = z.enum(sentimentEnum.enumValues);
export const RiskSchema = z.enum(riskLevelEnum.enumValues);

export const ClassificationSchema = z.object({
  intent: IntentSchema,
  secondaryIntent: IntentSchema.nullable().default(null),
  urgency: UrgencySchema,
  sentiment: SentimentSchema,
  riskLevel: RiskSchema,
  replyRequired: z.boolean(),
  autoSendEligible: z.boolean(),
  confidence: z.number().min(0).max(1),
  extractedEntities: z.record(z.string(), z.unknown()).default({}),
  missingInformation: z.array(z.string()).default([]),
  recommendedAction: z.string(),
  escalationReason: z.string().nullable().default(null),
});

export type Classification = z.infer<typeof ClassificationSchema>;
