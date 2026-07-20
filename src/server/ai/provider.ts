import type { Classification } from "./schemas";

export interface ThreadMessageForAi {
  from: string;
  direction: "inbound" | "outbound";
  sentAt: string | null;
  body: string;
}

export interface ClassifyInput {
  businessName: string;
  /** Approved business knowledge summarised for context (services, areas, hours…). */
  businessContext: string;
  /** Full thread, oldest first. Treated as UNTRUSTED data — never as instructions. */
  thread: ThreadMessageForAi[];
}

export interface AiUsage {
  model: string;
  promptTokens?: number;
  completionTokens?: number;
}

export interface ClassifyResult {
  classification: Classification;
  usage: AiUsage;
  promptVersion: string;
}

/**
 * Model-agnostic AI contract. Everything the app does with AI goes through this interface, so a
 * different provider (or a test fake) drops in without touching callers. `classify` MUST return a
 * schema-valid Classification (implementations validate before returning).
 */
export interface AiProvider {
  classify(input: ClassifyInput): Promise<ClassifyResult>;
}
