import { describe, it, expect } from "vitest";
import { evaluateAutoSend } from "./safety";
import type { Classification } from "./schemas";

function base(overrides: Partial<Classification> = {}): Classification {
  return {
    intent: "booking_enquiry",
    secondaryIntent: null,
    urgency: "normal",
    sentiment: "neutral",
    riskLevel: "low",
    replyRequired: true,
    autoSendEligible: true,
    confidence: 0.95,
    extractedEntities: {},
    missingInformation: [],
    recommendedAction: "request_missing_information",
    escalationReason: null,
    ...overrides,
  };
}

describe("auto-send safety policy", () => {
  it("allows a safe, high-confidence, low-risk acknowledgement", () => {
    expect(evaluateAutoSend(base()).eligible).toBe(true);
  });

  it("never grants auto-send the model didn't ask for", () => {
    expect(evaluateAutoSend(base({ autoSendEligible: false })).eligible).toBe(false);
  });

  it("blocks complaints and refunds regardless of confidence", () => {
    expect(evaluateAutoSend(base({ intent: "complaint" })).eligible).toBe(false);
    expect(evaluateAutoSend(base({ intent: "refund_request", confidence: 0.99 })).eligible).toBe(false);
  });

  it("blocks high / prohibited risk", () => {
    expect(evaluateAutoSend(base({ riskLevel: "high" })).eligible).toBe(false);
    expect(evaluateAutoSend(base({ riskLevel: "prohibited_auto_send" })).eligible).toBe(false);
  });

  it("blocks angry or threatening sentiment", () => {
    expect(evaluateAutoSend(base({ sentiment: "angry" })).eligible).toBe(false);
    expect(evaluateAutoSend(base({ sentiment: "threatening" })).eligible).toBe(false);
  });

  it("blocks low confidence and escalations", () => {
    expect(evaluateAutoSend(base({ confidence: 0.5 })).eligible).toBe(false);
    expect(evaluateAutoSend(base({ escalationReason: "unclear request" })).eligible).toBe(false);
  });

  it("returns a human-readable reason when blocked", () => {
    const d = evaluateAutoSend(base({ intent: "complaint" }));
    expect(d.reason).toMatch(/complaint/);
  });
});
