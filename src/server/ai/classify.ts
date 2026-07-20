import type { AiProvider, ClassifyInput, ClassifyResult } from "./provider";
import { applyAutoSendPolicy } from "./safety";

/**
 * Classify a thread through any AiProvider, then apply the server-side auto-send safety policy
 * (spec §16) so the stored `autoSendEligible` reflects OUR rules, not just the model's opinion. The
 * provider is injected so this is trivially unit-testable with a fake.
 */
export async function classifyThread(
  provider: AiProvider,
  input: ClassifyInput,
  opts?: { confidenceThreshold?: number },
): Promise<ClassifyResult> {
  const result = await provider.classify(input);
  return { ...result, classification: applyAutoSendPolicy(result.classification, opts) };
}
