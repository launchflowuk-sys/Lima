import { describe, it, expect } from "vitest";
import { ClassificationSchema } from "./schemas";
import { classifyThread } from "./classify";
import type { AiProvider, ClassifyResult } from "./provider";

describe("ClassificationSchema", () => {
  it("parses a valid payload and applies defaults", () => {
    const parsed = ClassificationSchema.parse({
      intent: "quote_request",
      urgency: "normal",
      sentiment: "neutral",
      riskLevel: "low",
      replyRequired: true,
      autoSendEligible: false,
      confidence: 0.9,
      recommendedAction: "prepare_quote",
    });
    expect(parsed.missingInformation).toEqual([]);
    expect(parsed.extractedEntities).toEqual({});
    expect(parsed.secondaryIntent).toBeNull();
  });

  it("rejects an unknown intent", () => {
    expect(() =>
      ClassificationSchema.parse({
        intent: "make_me_a_sandwich",
        urgency: "normal", sentiment: "neutral", riskLevel: "low",
        replyRequired: true, autoSendEligible: false, confidence: 0.9, recommendedAction: "x",
      }),
    ).toThrow();
  });
});

describe("classifyThread applies the safety policy over the model", () => {
  it("downgrades autoSendEligible when the model over-permits a complaint", async () => {
    const fake: AiProvider = {
      async classify(): Promise<ClassifyResult> {
        return {
          classification: ClassificationSchema.parse({
            intent: "complaint",
            urgency: "high", sentiment: "frustrated", riskLevel: "low",
            replyRequired: true, autoSendEligible: true, confidence: 0.97,
            recommendedAction: "acknowledge",
          }),
          usage: { model: "fake" },
          promptVersion: "test",
        };
      },
    };
    const result = await classifyThread(fake, { businessName: "B", businessContext: "", thread: [] });
    expect(result.classification.autoSendEligible).toBe(false);
  });
});
