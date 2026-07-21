import { describe, it, expect } from "vitest";
import { parseGraphMessage, parseGraphAttachment } from "./microsoft";

// A realistic Graph `/me/messages/{id}` resource: an HTML-bodied inbound message with mixed-case
// addresses, To + Cc recipients, and the standard Graph fields.
const fixture = {
  id: "AAMkAGI2THVSAAA=",
  conversationId: "AAQkAGI2-conversation-1",
  subject: "Quote request",
  from: { emailAddress: { name: "Jane Customer", address: "Jane@Example.com" } },
  toRecipients: [{ emailAddress: { name: "Support Team", address: "support@mybiz.com" } }],
  ccRecipients: [{ emailAddress: { address: "boss@example.com" } }],
  receivedDateTime: "2023-11-14T12:00:00Z",
  bodyPreview: "Hello, please send a quote",
  body: { contentType: "html", content: "<p>Hello, please send a quote.</p>" },
  hasAttachments: true,
  internetMessageId: "<abc123@mail.example.com>",
  isRead: false,
};

describe("parseGraphMessage", () => {
  const parsed = parseGraphMessage(fixture);

  it("extracts and lowercases the From address with its display name", () => {
    expect(parsed.from).toEqual({ address: "jane@example.com", name: "Jane Customer" });
  });

  it("extracts To and Cc participants", () => {
    expect(parsed.to).toEqual([{ address: "support@mybiz.com", name: "Support Team" }]);
    expect(parsed.cc).toEqual([{ address: "boss@example.com", name: null }]);
  });

  it("reads the subject and uses the Graph message id as the provider message id", () => {
    expect(parsed.subject).toBe("Quote request");
    expect(parsed.providerMessageId).toBe("AAMkAGI2THVSAAA=");
  });

  it("uses the conversationId as the provider thread id", () => {
    expect(parsed.providerThreadId).toBe("AAQkAGI2-conversation-1");
  });

  it("maps an HTML body into bodyHtml and leaves bodyText null", () => {
    expect(parsed.bodyHtml).toBe("<p>Hello, please send a quote.</p>");
    expect(parsed.bodyText).toBeNull();
  });

  it("derives the snippet from bodyPreview", () => {
    expect(parsed.snippet).toBe("Hello, please send a quote");
  });

  it("derives sentAt from receivedDateTime and defaults direction to inbound", () => {
    expect(parsed.sentAt).toEqual(new Date("2023-11-14T12:00:00Z"));
    expect(parsed.direction).toBe("inbound");
  });

  it("maps a plain-text body into bodyText and leaves bodyHtml null", () => {
    const textMsg = parseGraphMessage({ ...fixture, body: { contentType: "text", content: "Plain body" } });
    expect(textMsg.bodyText).toBe("Plain body");
    expect(textMsg.bodyHtml).toBeNull();
  });

  it("returns empty attachments (metadata is fetched separately by the provider)", () => {
    expect(parsed.attachments).toEqual([]);
  });

  it("falls back to the sender when from is absent", () => {
    const senderOnly = parseGraphMessage({
      ...fixture,
      from: null,
      sender: { emailAddress: { address: "Alias@Example.com" } },
    });
    expect(senderOnly.from).toEqual({ address: "alias@example.com", name: null });
  });
});

describe("parseGraphAttachment", () => {
  it("maps Graph attachment metadata into a ProviderAttachment", () => {
    expect(
      parseGraphAttachment({ id: "att-1", name: "quote.pdf", contentType: "application/pdf", size: 20480 }),
    ).toEqual({
      providerAttachmentId: "att-1",
      filename: "quote.pdf",
      contentType: "application/pdf",
      sizeBytes: 20480,
    });
  });
});
