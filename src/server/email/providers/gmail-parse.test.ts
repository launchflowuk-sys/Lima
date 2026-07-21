import { describe, it, expect } from "vitest";
import type { gmail_v1 } from "googleapis";
import { parseGmailMessage } from "./gmail";

const b64url = (s: string): string => Buffer.from(s, "utf8").toString("base64url");

// A realistic `users.messages.get?format=full` payload: multipart/mixed → multipart/alternative
// (text + html) plus a PDF attachment, with the standard RFC5322 headers Gmail returns.
const fixture: gmail_v1.Schema$Message = {
  id: "18fabc0000000001",
  threadId: "18fabc0000000thread",
  labelIds: ["INBOX", "UNREAD"],
  snippet: "Hello, please send a quote",
  internalDate: "1700000000000",
  payload: {
    mimeType: "multipart/mixed",
    headers: [
      { name: "From", value: "Jane Customer <Jane@Example.com>" },
      { name: "To", value: "Support Team <support@mybiz.com>" },
      { name: "Cc", value: "boss@example.com" },
      { name: "Subject", value: "Quote request" },
      { name: "Date", value: "Tue, 14 Nov 2023 12:00:00 +0000" },
      { name: "Message-ID", value: "<abc123@mail.example.com>" },
    ],
    parts: [
      {
        mimeType: "multipart/alternative",
        parts: [
          { mimeType: "text/plain", body: { size: 27, data: b64url("Hello, please send a quote.") } },
          { mimeType: "text/html", body: { size: 40, data: b64url("<p>Hello, please send a quote.</p>") } },
        ],
      },
      {
        mimeType: "application/pdf",
        filename: "quote.pdf",
        body: { attachmentId: "att-abc-1", size: 20480 },
      },
    ],
  },
};

describe("parseGmailMessage", () => {
  const parsed = parseGmailMessage(fixture);

  it("extracts and lowercases the From address with its display name", () => {
    expect(parsed.from).toEqual({ address: "jane@example.com", name: "Jane Customer" });
  });

  it("extracts To and Cc participants", () => {
    expect(parsed.to).toEqual([{ address: "support@mybiz.com", name: "Support Team" }]);
    expect(parsed.cc).toEqual([{ address: "boss@example.com", name: null }]);
  });

  it("reads the subject and uses the RFC Message-ID as the provider message id", () => {
    expect(parsed.subject).toBe("Quote request");
    expect(parsed.providerMessageId).toBe("<abc123@mail.example.com>");
  });

  it("uses the Gmail threadId as the provider thread id", () => {
    expect(parsed.providerThreadId).toBe("18fabc0000000thread");
  });

  it("decodes the base64url text and html bodies", () => {
    expect(parsed.bodyText).toBe("Hello, please send a quote.");
    expect(parsed.bodyHtml).toBe("<p>Hello, please send a quote.</p>");
  });

  it("maps attachment metadata from parts with a filename + attachmentId", () => {
    expect(parsed.attachments).toEqual([
      { providerAttachmentId: "att-abc-1", filename: "quote.pdf", contentType: "application/pdf", sizeBytes: 20480 },
    ]);
  });

  it("derives sentAt from internalDate and direction from labels", () => {
    expect(parsed.sentAt).toEqual(new Date(1700000000000));
    expect(parsed.direction).toBe("inbound");
  });

  it("marks SENT-labelled messages as outbound", () => {
    const sent = parseGmailMessage({ ...fixture, labelIds: ["SENT"] });
    expect(sent.direction).toBe("outbound");
  });

  it("falls back to a gmail-prefixed id when Message-ID is absent", () => {
    const noMsgId: gmail_v1.Schema$Message = {
      ...fixture,
      payload: {
        ...fixture.payload,
        headers: (fixture.payload?.headers ?? []).filter((h) => h.name !== "Message-ID"),
      },
    };
    expect(parseGmailMessage(noMsgId).providerMessageId).toBe("gmail:18fabc0000000001");
  });
});
