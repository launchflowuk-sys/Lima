import { it, expect, vi } from "vitest";
import { eq } from "drizzle-orm";
import {
  describeIntegration,
  createOrganisation,
  createUser,
  createBusiness,
  createMailbox,
  createThread,
  createInboundMessage,
  authUserFor,
} from "./harness";
import { db } from "@/server/db/client";
import {
  replyDrafts,
  replyVersions,
  emailMessages,
  emailThreads,
  emailClassifications,
  aiUsageRecords,
  auditLogs,
} from "@/server/db/schema";
import type { AiProvider } from "@/server/ai/provider";
import type { Classification } from "@/server/ai/schemas";

// A deterministic, schema-valid classification: a plain enquiry the model does NOT mark auto-send
// eligible → the draft must land as pending_approval (never auto-sent), which is what we then approve.
const classification: Classification = {
  intent: "general_enquiry",
  secondaryIntent: null,
  urgency: "normal",
  sentiment: "neutral",
  riskLevel: "low",
  replyRequired: true,
  autoSendEligible: false,
  confidence: 0.9,
  extractedEntities: {},
  missingInformation: [],
  recommendedAction: "Reply with opening hours.",
  escalationReason: null,
};

const AI_REPLY = "Hello, our opening hours are 9am to 5pm, Monday to Friday.";

// Fake AI provider — no OpenAI network. classify/generateReply return fixed, valid payloads.
const fakeAi: AiProvider = {
  classify: vi.fn(async () => ({ classification, usage: { model: "fake-classify" }, promptVersion: "test-v1" })),
  generateReply: vi.fn(async () => ({ bodyText: AI_REPLY, usage: { model: "fake-reply" }, promptVersion: "test-v1" })),
};
vi.mock("@/server/ai", () => ({ getAiProvider: () => fakeAi }));

// Stub the email provider so "send" records outbound state without real SMTP.
const sendReply = vi.hoisted(() => vi.fn());
vi.mock("@/server/email/providers/registry", () => ({
  getProvider: () => ({ sendReply, verifyConnection: vi.fn() }),
}));

async function setupThread() {
  const org = await createOrganisation();
  const business = await createBusiness(org.id, "Grays CabLine");
  const mailbox = await createMailbox({ businessId: business.id, emailAddress: "support@grays.example" });
  const thread = await createThread({ businessId: business.id, mailboxId: mailbox.id, subject: "Opening hours?" });
  const inbound = await createInboundMessage({
    businessId: business.id,
    threadId: thread.id,
    mailboxId: mailbox.id,
    fromAddress: "customer@example.com",
    bodyText: "Hi, what time do you open?",
  });
  const owner = await authUserFor((await createUser({ organisationId: org.id, isOwner: true })).id);
  return { org, business, mailbox, thread, inbound, owner };
}

describeIntegration("draft → approve → send pipeline", () => {
  it("generates a pending-approval draft that persists the safety decision and classification", async () => {
    const { business, thread, inbound, owner } = await setupThread();

    // Act
    const draft = await import("@/server/drafts/service").then((m) => m.generateDraftForThread(owner, thread.id));

    // Draft persisted, pending approval, with the AI body and the auto-send block reason recorded.
    expect(draft.status).toBe("pending_approval");
    expect(draft.bodyText).toBe(AI_REPLY);
    expect(draft.autoSendEligible).toBe(false);
    expect(draft.autoSendBlockedReason).toMatch(/auto-send/i);
    expect(draft.knowledgeUsed).toEqual([]); // no knowledge seeded → nothing used

    // Classification + usage rows written for this business/message.
    const cls = await db.select().from(emailClassifications).where(eq(emailClassifications.messageId, inbound.id));
    expect(cls).toHaveLength(1);
    expect(cls[0].intent).toBe("general_enquiry");

    const usage = await db.select().from(aiUsageRecords).where(eq(aiUsageRecords.businessId, business.id));
    expect(usage.map((u) => u.purpose).sort()).toEqual(["classification", "reply"]);

    // Nothing auto-sent → thread is waiting for a human.
    const [t] = await db.select().from(emailThreads).where(eq(emailThreads.id, thread.id));
    expect(t.status).toBe("draft_prepared");
  });

  it("approve & send writes an outbound message, advances the thread, and records a version + audit", async () => {
    sendReply.mockResolvedValue({ providerMessageId: "smtp-msg-123" });
    const { thread, mailbox, owner } = await setupThread();

    const draft = await import("@/server/drafts/service").then((m) => m.generateDraftForThread(owner, thread.id));

    // Approver edits before sending → a new immutable version is stored.
    const editedBody = "Hello! We're open 9-5, Mon-Fri. Thanks for getting in touch.";
    const { approveAndSendDraft } = await import("@/server/approvals/service");
    const sent = await approveAndSendDraft(owner, draft.id, editedBody);

    expect(sent.providerMessageId).toBe("smtp-msg-123");
    expect(sendReply).toHaveBeenCalledOnce();

    // Draft flipped to sent.
    const [updated] = await db.select().from(replyDrafts).where(eq(replyDrafts.id, draft.id));
    expect(updated.status).toBe("sent");
    expect(updated.bodyText).toBe(editedBody);
    expect(updated.approvedByUserId).toBe(owner.id);
    expect(updated.sentProviderMessageId).toBe("smtp-msg-123");

    // A version row captured the human edit.
    const versions = await db.select().from(replyVersions).where(eq(replyVersions.draftId, draft.id));
    expect(versions).toHaveLength(1);
    expect(versions[0].bodyText).toBe(editedBody);
    expect(versions[0].isAiGenerated).toBe(false);

    // An outbound message now exists on the thread, from the mailbox address, with the edited body.
    const outbound = await db
      .select()
      .from(emailMessages)
      .where(eq(emailMessages.threadId, thread.id));
    const sentMsg = outbound.find((m) => m.direction === "outbound");
    expect(sentMsg).toBeTruthy();
    expect(sentMsg!.fromAddress).toBe(mailbox.emailAddress);
    expect(sentMsg!.bodyText).toBe(editedBody);
    expect(sentMsg!.providerMessageId).toBe("smtp-msg-123");

    // Thread advanced to waiting on the customer.
    const [t] = await db.select().from(emailThreads).where(eq(emailThreads.id, thread.id));
    expect(t.status).toBe("waiting_customer");

    // Audit trail recorded the send.
    const audits = await db.select().from(auditLogs).where(eq(auditLogs.entityId, draft.id));
    expect(audits.some((a) => a.action === "reply.sent")).toBe(true);
  });
});
