import { randomBytes } from "node:crypto";
import type { gmail_v1 } from "googleapis";
import { env } from "@/env";
import { authedGmailClient } from "./gmail-client";
import type {
  EmailProvider,
  Mailbox,
  ProviderAttachment,
  ProviderMessage,
  ProviderThread,
  SendReplyInput,
  SendResult,
  SyncResult,
  WatchResult,
} from "./types";

/**
 * Gmail adapter (Gmail API + OAuth2 + Pub/Sub watch). Real network implementation. Credentials are
 * the mailbox's encrypted OAuth tokens, decrypted on demand inside the authed client; never logged,
 * never returned to the client. Message parsing (parseGmailMessage) is a pure exported helper so it
 * can be unit-tested without the network.
 */

// Cap the initial (no-cursor) pull so a large mailbox doesn't fetch thousands of messages at once.
const INITIAL_MAX = 50;

export class GmailProvider implements EmailProvider {
  readonly kind = "gmail" as const;
  private clientPromise: Promise<gmail_v1.Gmail> | null = null;

  constructor(private readonly mailbox: Mailbox) {}

  private client(): Promise<gmail_v1.Gmail> {
    if (!this.clientPromise) this.clientPromise = authedGmailClient(this.mailbox);
    return this.clientPromise;
  }

  async verifyConnection(): Promise<void> {
    const gmail = await this.client();
    await gmail.users.getProfile({ userId: "me" });
  }

  async listChanges(cursor: string | null): Promise<SyncResult> {
    const gmail = await this.client();
    if (!cursor) return this.initialList(gmail);

    try {
      const changedMessageIds = new Set<string>();
      let pageToken: string | undefined;
      let latestHistoryId: string | null = cursor;
      do {
        const res = await gmail.users.history.list({
          userId: "me",
          startHistoryId: cursor,
          historyTypes: ["messageAdded"],
          pageToken,
        });
        for (const h of res.data.history ?? []) {
          for (const added of h.messagesAdded ?? []) {
            const id = added.message?.id;
            if (id) changedMessageIds.add(id);
          }
        }
        if (res.data.historyId) latestHistoryId = res.data.historyId;
        pageToken = res.data.nextPageToken ?? undefined;
      } while (pageToken);
      return { changedMessageIds: [...changedMessageIds], cursor: latestHistoryId };
    } catch (err) {
      // A 404 means the stored historyId is too old to expand — fall back to a recent-message pull.
      if (isHistoryTooOld(err)) return this.initialList(gmail);
      throw err;
    }
  }

  /** Recent INBOX messages + the current historyId as the new cursor (initial + fallback path). */
  private async initialList(gmail: gmail_v1.Gmail): Promise<SyncResult> {
    const list = await gmail.users.messages.list({ userId: "me", labelIds: ["INBOX"], maxResults: INITIAL_MAX });
    const changedMessageIds = (list.data.messages ?? []).map((m) => m.id).filter((id): id is string => Boolean(id));
    const profile = await gmail.users.getProfile({ userId: "me" });
    return { changedMessageIds, cursor: profile.data.historyId ?? null };
  }

  async fetchThread(providerThreadId: string): Promise<ProviderThread> {
    const gmail = await this.client();
    const res = await gmail.users.threads.get({ userId: "me", id: providerThreadId, format: "full" });
    const messages = (res.data.messages ?? []).map(parseGmailMessage);
    return { providerThreadId, subject: messages[0]?.subject ?? null, messages };
  }

  async fetchMessage(providerMessageId: string): Promise<ProviderMessage> {
    const gmail = await this.client();
    const res = await gmail.users.messages.get({ userId: "me", id: providerMessageId, format: "full" });
    return parseGmailMessage(res.data);
  }

  async createDraft(input: SendReplyInput): Promise<{ providerDraftId: string }> {
    const gmail = await this.client();
    const raw = this.buildRaw(input);
    const res = await gmail.users.drafts.create({
      userId: "me",
      requestBody: { message: { raw, threadId: input.providerThreadId } },
    });
    if (!res.data.id) throw new Error("Gmail draft creation returned no id");
    return { providerDraftId: res.data.id };
  }

  async sendReply(input: SendReplyInput): Promise<SendResult> {
    const gmail = await this.client();
    const raw = this.buildRaw(input);
    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw, threadId: input.providerThreadId },
    });
    if (!res.data.id) throw new Error("Gmail send returned no message id");
    return { providerMessageId: res.data.id };
  }

  async watch(): Promise<WatchResult> {
    if (!env.GOOGLE_PUBSUB_TOPIC) return { subscriptionId: null, expiresAt: null, cursor: null };
    const gmail = await this.client();
    const res = await gmail.users.watch({
      userId: "me",
      requestBody: { topicName: env.GOOGLE_PUBSUB_TOPIC, labelIds: ["INBOX"] },
    });
    const historyId = res.data.historyId ?? null;
    const expiresAt = res.data.expiration ? new Date(Number(res.data.expiration)) : null;
    return { subscriptionId: historyId, expiresAt, cursor: historyId };
  }

  async unwatch(): Promise<void> {
    if (!env.GOOGLE_PUBSUB_TOPIC) return;
    const gmail = await this.client();
    await gmail.users.stop({ userId: "me" });
  }

  /** RFC 2822 MIME (base64url) for send/draft, using this mailbox as the From. */
  private buildRaw(input: SendReplyInput): string {
    return buildRawMessage({
      from: formatFromHeader(this.mailbox),
      to: input.to,
      cc: input.cc,
      subject: input.subject,
      inReplyTo: input.inReplyToProviderMessageId,
      bodyText: input.bodyText,
      bodyHtml: input.bodyHtml,
    });
  }
}

// ─── Pure parsing helpers (unit-tested) ──────────────────────────────────────────

interface CollectedBody {
  text: string[];
  html: string[];
  attachments: ProviderAttachment[];
}

function decodeBody(data: string | null | undefined): string {
  if (!data) return "";
  return Buffer.from(data, "base64url").toString("utf8");
}

function getHeader(headers: gmail_v1.Schema$MessagePartHeader[], name: string): string | null {
  const lower = name.toLowerCase();
  const found = headers.find((h) => (h.name ?? "").toLowerCase() === lower);
  return found?.value ?? null;
}

/** Split an address-list header on commas that are not inside quotes or angle brackets. */
function splitAddresses(raw: string): string[] {
  const parts: string[] = [];
  let current = "";
  let inQuotes = false;
  let inAngle = false;
  for (const ch of raw) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === "<") inAngle = true;
    else if (ch === ">") inAngle = false;
    if (ch === "," && !inQuotes && !inAngle) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current);
  return parts;
}

function parseSingleAddress(raw: string): { address: string; name: string | null } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const angle = trimmed.match(/^(.*)<([^>]+)>\s*$/);
  if (angle) {
    const name = angle[1].trim().replace(/^"(.*)"$/, "$1").trim();
    const address = angle[2].trim().toLowerCase();
    return address ? { address, name: name || null } : null;
  }
  return { address: trimmed.toLowerCase(), name: null };
}

function parseAddressList(raw: string | null): Array<{ address: string; name: string | null }> {
  if (!raw) return [];
  return splitAddresses(raw)
    .map(parseSingleAddress)
    .filter((a): a is { address: string; name: string | null } => a !== null && Boolean(a.address));
}

/** Recursively collect text/html bodies and attachment metadata from a Gmail payload tree. */
function walkParts(part: gmail_v1.Schema$MessagePart | undefined, acc: CollectedBody): void {
  if (!part) return;
  const mimeType = part.mimeType ?? "";
  const filename = part.filename ?? "";
  const body = part.body;
  if (filename && body?.attachmentId) {
    acc.attachments.push({
      providerAttachmentId: body.attachmentId,
      filename: filename || null,
      contentType: mimeType || null,
      sizeBytes: typeof body.size === "number" ? body.size : null,
    });
  } else if (mimeType === "text/plain" && body?.data) {
    acc.text.push(decodeBody(body.data));
  } else if (mimeType === "text/html" && body?.data) {
    acc.html.push(decodeBody(body.data));
  }
  for (const child of part.parts ?? []) walkParts(child, acc);
}

/**
 * Map a Gmail `messages.get`/`threads.get` message into the provider-neutral ProviderMessage.
 * Pure — no network, no DB. `direction` is a best-effort default (SENT label ⇒ outbound); the sync
 * layer is authoritative and recomputes it from the From address vs the mailbox address.
 */
export function parseGmailMessage(msg: gmail_v1.Schema$Message): ProviderMessage {
  const payload = msg.payload ?? undefined;
  const headers = payload?.headers ?? [];
  const acc: CollectedBody = { text: [], html: [], attachments: [] };
  walkParts(payload, acc);

  const from = parseAddressList(getHeader(headers, "From"))[0] ?? null;
  const to = parseAddressList(getHeader(headers, "To"));
  const cc = parseAddressList(getHeader(headers, "Cc"));

  const messageIdHeader = getHeader(headers, "Message-ID") ?? getHeader(headers, "Message-Id");
  const providerMessageId = messageIdHeader?.trim() || (msg.id ? `gmail:${msg.id}` : "");

  const dateHeader = getHeader(headers, "Date");
  const rawSentAt = msg.internalDate
    ? new Date(Number(msg.internalDate))
    : dateHeader
      ? new Date(dateHeader)
      : null;
  const sentAt = rawSentAt && !Number.isNaN(rawSentAt.getTime()) ? rawSentAt : null;

  const bodyText = acc.text.join("\n").trim() || null;
  const bodyHtml = acc.html.join("\n").trim() || null;
  const snippet = (msg.snippet ?? bodyText ?? "").slice(0, 200) || null;
  const direction: "inbound" | "outbound" = (msg.labelIds ?? []).includes("SENT") ? "outbound" : "inbound";

  return {
    providerMessageId,
    providerThreadId: msg.threadId ?? "",
    direction,
    from,
    to,
    cc,
    subject: getHeader(headers, "Subject"),
    bodyText,
    bodyHtml,
    snippet,
    sentAt,
    attachments: acc.attachments,
  };
}

// ─── MIME builder (send / draft) ─────────────────────────────────────────────────

interface RawMessageInput {
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  inReplyTo?: string;
  bodyText: string;
  bodyHtml?: string;
}

/** RFC 2047 encoded-word for header values containing non-ASCII; passthrough otherwise. */
function encodeHeaderValue(value: string): string {
  if (/^[\x00-\x7F]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

/** Ensure a Message-ID carries angle brackets (In-Reply-To / References require them). */
function ensureAngle(id: string): string {
  const trimmed = id.trim();
  if (!trimmed) return trimmed;
  return trimmed.startsWith("<") ? trimmed : `<${trimmed}>`;
}

function formatFromHeader(mailbox: Mailbox): string {
  const email = mailbox.emailAddress;
  return mailbox.displayName ? `${encodeHeaderValue(mailbox.displayName)} <${email}>` : email;
}

/** Build an RFC 2822 message and return it base64url-encoded for the Gmail `raw` field. */
export function buildRawMessage(input: RawMessageInput): string {
  const headers: string[] = [
    `From: ${input.from}`,
    `To: ${input.to.join(", ")}`,
  ];
  if (input.cc?.length) headers.push(`Cc: ${input.cc.join(", ")}`);
  headers.push(`Subject: ${encodeHeaderValue(input.subject)}`);
  if (input.inReplyTo) {
    const ref = ensureAngle(input.inReplyTo);
    headers.push(`In-Reply-To: ${ref}`);
    headers.push(`References: ${ref}`);
  }
  headers.push("MIME-Version: 1.0");

  let body: string;
  if (input.bodyHtml) {
    const boundary = `lima_${randomBytes(12).toString("hex")}`;
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    body = [
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      Buffer.from(input.bodyText, "utf8").toString("base64"),
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      Buffer.from(input.bodyHtml, "utf8").toString("base64"),
      `--${boundary}--`,
      "",
    ].join("\r\n");
  } else {
    headers.push('Content-Type: text/plain; charset="UTF-8"');
    headers.push("Content-Transfer-Encoding: base64");
    body = Buffer.from(input.bodyText, "utf8").toString("base64");
  }

  const mime = `${headers.join("\r\n")}\r\n\r\n${body}`;
  return Buffer.from(mime, "utf8").toString("base64url");
}

// ─── Error narrowing ─────────────────────────────────────────────────────────────

function isHistoryTooOld(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { code?: unknown; status?: unknown; response?: { status?: unknown } };
  return e.code === 404 || e.status === 404 || e.response?.status === 404;
}
