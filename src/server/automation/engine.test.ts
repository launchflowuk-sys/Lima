import { describe, it, expect } from "vitest";
import { ruleMatches, evaluateRules, type RuleContext, type RuleForEval } from "./engine";

const baseCtx: RuleContext = {
  intent: "booking_enquiry",
  secondaryIntent: null,
  urgency: "normal",
  sentiment: "neutral",
  riskLevel: "low",
  fromAddress: "customer@example.com",
  subject: "Booking for Friday",
  bodyText: "Can I book a taxi to Heathrow on Friday?",
};

function rule(partial: Partial<RuleForEval>): RuleForEval {
  return { id: "r", priority: 100, stopOnMatch: false, conditions: {}, actions: {}, ...partial };
}

describe("ruleMatches", () => {
  it("matches when intent is in the allow list", () => {
    expect(ruleMatches({ intents: ["booking_enquiry"] }, baseCtx)).toBe(true);
  });
  it("does not match a different intent", () => {
    expect(ruleMatches({ intents: ["complaint"] }, baseCtx)).toBe(false);
  });
  it("matches on secondary intent", () => {
    expect(ruleMatches({ intents: ["quote_request"] }, { ...baseCtx, secondaryIntent: "quote_request" })).toBe(true);
  });
  it("excludeIntents blocks a match", () => {
    expect(ruleMatches({ intents: ["booking_enquiry"], excludeIntents: ["booking_enquiry"] }, baseCtx)).toBe(false);
  });
  it("maxRiskLevel matches equal-or-lower risk only", () => {
    expect(ruleMatches({ maxRiskLevel: "low" }, baseCtx)).toBe(true);
    expect(ruleMatches({ maxRiskLevel: "low" }, { ...baseCtx, riskLevel: "high" })).toBe(false);
    expect(ruleMatches({ maxRiskLevel: "high" }, { ...baseCtx, riskLevel: "medium" })).toBe(true);
  });
  it("substring conditions are case-insensitive", () => {
    expect(ruleMatches({ fromContains: ["EXAMPLE.com"] }, baseCtx)).toBe(true);
    expect(ruleMatches({ subjectContains: ["friday"] }, baseCtx)).toBe(true);
    expect(ruleMatches({ bodyContains: ["heathrow"] }, baseCtx)).toBe(true);
    expect(ruleMatches({ bodyContains: ["gatwick"] }, baseCtx)).toBe(false);
  });
  it("requires ALL specified conditions (AND)", () => {
    expect(ruleMatches({ intents: ["booking_enquiry"], urgencies: ["critical"] }, baseCtx)).toBe(false);
  });
  it("an empty condition set matches everything", () => {
    expect(ruleMatches({}, baseCtx)).toBe(true);
  });
});

describe("evaluateRules", () => {
  it("returns autoSend when a matching rule allows it and nothing holds", () => {
    const res = evaluateRules([rule({ conditions: { intents: ["booking_enquiry"] }, actions: { autoSend: true } })], baseCtx);
    expect(res.autoSend).toBe(true);
    expect(res.matchedRuleIds).toEqual(["r"]);
  });

  it("holdForApproval overrides autoSend even from another rule", () => {
    const res = evaluateRules(
      [
        rule({ id: "a", priority: 10, actions: { autoSend: true } }),
        rule({ id: "b", priority: 20, actions: { holdForApproval: true } }),
      ],
      baseCtx,
    );
    expect(res.autoSend).toBe(false);
    expect(res.holdForApproval).toBe(true);
  });

  it("escalate implies hold and disables auto-send", () => {
    const res = evaluateRules([rule({ actions: { autoSend: true, escalate: true } })], baseCtx);
    expect(res.escalate).toBe(true);
    expect(res.autoSend).toBe(false);
    expect(res.holdForApproval).toBe(true);
  });

  it("unions tags from all matched rules", () => {
    const res = evaluateRules(
      [
        rule({ id: "a", priority: 10, actions: { addTags: ["vip"] } }),
        rule({ id: "b", priority: 20, actions: { addTags: ["vip", "urgent"] } }),
      ],
      baseCtx,
    );
    expect(res.tags.sort()).toEqual(["urgent", "vip"]);
  });

  it("stopOnMatch halts lower-priority rules", () => {
    const res = evaluateRules(
      [
        rule({ id: "first", priority: 10, stopOnMatch: true, actions: { holdForApproval: true } }),
        rule({ id: "second", priority: 20, actions: { autoSend: true } }),
      ],
      baseCtx,
    );
    expect(res.matchedRuleIds).toEqual(["first"]);
    expect(res.autoSend).toBe(false);
  });

  it("no matching rules → no actions", () => {
    const res = evaluateRules([rule({ conditions: { intents: ["complaint"] }, actions: { autoSend: true } })], baseCtx);
    expect(res.matchedRuleIds).toEqual([]);
    expect(res.autoSend).toBe(false);
    expect(res.escalate).toBe(false);
  });
});
