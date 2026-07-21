import { env } from "@/env";
import { authedGraphClient, type GraphClient } from "./microsoft-client";
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
 * Microsoft 365 / Outlook adapter (Graph v1.0 REST + OAuth2 + delta queries). Real network
 * implementation using plain `fetch` via the authed Graph client — no MSAL, no Graph SDK. Credentials
 * are the mailbox's encrypted OAuth tokens, decrypted on demand inside the authed client; never
 * logged, never returned to the client. Message parsing (parseGraphMessage) is a pure exported helper
 * so it can be unit-tested without the network.
 *
 * Incremental sync uses Graph delta on the inbox. On the very first run (no cursor) we grab the newest
 * 50 message ids via a plain `$orderby` query (bounded — a large mailbox never pulls its whole
 * history) and separately establish a starting deltaLink with `?$deltatoken=latest`, which returns
 * "changes since now" (i.e. none) plus a deltaLink to resume from. Every later run GETs the stored
 * deltaLink, pages through @odata.nextLink collecting changed ids, and stores the final @odata.deltaLink
 * as the next cursor.
 */

// Cap the initial (no-cursor) pull so a large mailbox doesn't fetch thousands of messages at once.
const INITIAL_MAX = 50;
// Fields we need on each message. Kept in one place so the delta + single-message fetches agree.
const MESSAGE_SELECT =
  "id,conversationId,subject,from,toRecipients,ccRecipients,receivedDateTime,bodyPreview,body,hasAttachments,internetMessageId,isRead";

export class MicrosoftProvider implements EmailProvider {
  readonly kind = "microsoft" as const;
  private clientPromise: Promise<GraphClient> | null = null;

  constructor(private readonly mailbox: Mailbox) {}

  private client(): Promise<GraphClient> {
    if (!this.clientPromise) this.clientPromise = authedGraphClient(this.mailbox);
    return this.clientPromise;
  }

  async verifyConnection(): Promise<void> {
    const client = await this.client();
    await client.requestJson("/me?$select=id");
  }

  async listChanges(cursor: string | null): Promise<SyncResult> {
    const client = await this.client();
    if (!cursor) return this.initialList(client);

    try {
      const changedMessageIds = new Set<string>();
      let nextUrl: string | null = cursor;
      let deltaLink: string | null = cursor;
      do {
        const page: DeltaResponse = await client.requestJson<DeltaResponse>(nextUrl);
        for (const item of page.value ?? []) {
          if (item.id && !("@removed" in item)) changedMessageIds.add(item.id);
        }
        deltaLink = page["@odata.deltaLink"] ?? deltaLink;
        nextUrl = page["@odata.nextLink"] ?? null;
      } while (nextUrl);
      return { changedMessageIds: [...changedMessageIds], cursor: deltaLink };
    } catch (err) {
      // A stale/invalid delta token (410 Gone / 400) means we must re-establish — fall back to a recent pull.
      if (isDeltaExpired(err)) return this.initialList(client);
      throw err;
    }
  }

  /** Newest INBOX messages + a fresh deltaLink as the cursor (initial + fallback path). */
  private async initialList(client: GraphClient): Promise<SyncResult> {
    const list = await client.requestJson<MessagesListResponse>(
      `/me/mailFolders/inbox/messages?$top=${INITIAL_MAX}&$orderby=receivedDateTime desc&$select=id`,
    );
    const changedMessageIds = (list.value ?? []).map((m) => m.id).filter((id): id is string => Boolean(id));

    // `$deltatoken=latest` short-circuits to the current state: no messages, just a deltaLink to resume from.
    let cursor: string | null = null;
    try {
      const seed = await client.requestJson<DeltaResponse>(
        "/me/mailFolders/inbox/messages/delta?$deltatoken=latest",
      );
      cursor = seed["@odata.deltaLink"] ?? null;
    } catch {
      // If seeding the deltaLink fails we still return the messages; the next run retries the initial path.
    }
    return { changedMessageIds, cursor };
  }

  async fetchThread(providerThreadId: string): Promise<ProviderThread> {
    const client = await this.client();
    // Graph has no "get thread"; query the conversation instead.
    const res = await client.requestJson<MessagesListResponse<GraphMessage>>(
      `/me/messages?$filter=conversationId eq '${encodeODataString(providerThreadId)}'&$select=${MESSAGE_SELECT}&$orderby=receivedDateTime asc`,
    );
    const messages = (res.value ?? []).map(parseGraphMessage);
    return { providerThreadId, subject: messages[0]?.subject ?? null, messages };
  }

  async fetchMessage(providerMessageId: string): Promise<ProviderMessage> {
    const client = await this.client();
    const msg = await client.requestJson<GraphMessage>(
      `/me/messages/${encodeURIComponent(providerMessageId)}?$select=${MESSAGE_SELECT}`,
    );
    const parsed = parseGraphMessage(msg);
    if (msg.hasAttachments) {
      try {
        const atts = await client.requestJson<MessagesListResponse<GraphAttachment>>(
          `/me/messages/${encodeURIComponent(providerMessageId)}/attachments?$select=id,name,contentType,size`,
        );
        parsed.attachments = (atts.value ?? []).map(parseGraphAttachment);
      } catch {
        // Attachment metadata is best-effort; the message body still ingests without it.
      }
    }
    return parsed;
  }

  async createDraft(input: SendReplyInput): Promise<{ providerDraftId: string }> {
    const client = await this.client();
    const draft = await client.requestJson<{ id?: string }>("/me/messages", {
      method: "POST",
      body: JSON.stringify(buildGraphMessage(input)),
    });
    if (!draft.id) throw new Error("Microsoft draft creation returned no id");
    return { providerDraftId: draft.id };
  }

  async sendReply(input: SendReplyInput): Promise<SendResult> {
    const client = await this.client();
    const body = buildMessageBody(input);
    const toRecipients = input.to.map(toRecipient);
    const ccRecipients = (input.cc ?? []).map(toRecipient);

    if (input.inReplyToProviderMessageId) {
      // Graph's reply action preserves threading + subject; it returns 202 with no id.
      const res = await client.request(
        `/me/messages/${encodeURIComponent(input.inReplyToProviderMessageId)}/reply`,
        { method: "POST", body: JSON.stringify({ message: { toRecipients, ccRecipients, body }, comment: "" }) },
      );
      if (!res.ok) throw new Error(`Microsoft reply failed (${res.status})`);
    } else {
      const res = await client.request("/me/sendMail", {
        method: "POST",
        body: JSON.stringify({
          message: { subject: input.subject, body, toRecipients, ccRecipients },
          saveToSentItems: true,
        }),
      });
      if (!res.ok) throw new Error(`Microsoft sendMail failed (${res.status})`);
    }
    // sendMail/reply confirm via 202 and never return a message id — the accepted status is the receipt.
    return { providerMessageId: "" };
  }

  /**
   * Graph change-notification subscriptions need a public webhook that answers a synchronous
   * validation handshake plus a renewal loop. Without that endpoint wired up we treat watch as a
   * documented no-op and rely on delta polling (mirrors how Gmail treats Pub/Sub as optional).
   * Enabling it later means creating a subscription to `/me/mailFolders('inbox')/messages` with a
   * notificationUrl of `${APP_URL}/api/oauth/microsoft/push` gated on MICROSOFT_WEBHOOK_CLIENT_STATE.
   */
  async watch(): Promise<WatchResult> {
    void env.MICROSOFT_WEBHOOK_CLIENT_STATE; // referenced intentionally; see the doc comment above.
    return { subscriptionId: null, clientState: null, expiresAt: null, cursor: null };
  }

  async unwatch(): Promise<void> {
    // No-op: no subscription is created (see watch()).
  }
}

// ─── Pure parsing helpers (unit-tested) ──────────────────────────────────────────

interface GraphEmailAddress {
  name?: string | null;
  address?: string | null;
}
interface GraphRecipient {
  emailAddress?: GraphEmailAddress | null;
}
interface GraphMessage {
  id?: string;
  conversationId?: string | null;
  subject?: string | null;
  from?: GraphRecipient | null;
  sender?: GraphRecipient | null;
  toRecipients?: GraphRecipient[] | null;
  ccRecipients?: GraphRecipient[] | null;
  receivedDateTime?: string | null;
  bodyPreview?: string | null;
  body?: { contentType?: string | null; content?: string | null } | null;
  hasAttachments?: boolean | null;
  internetMessageId?: string | null;
  isRead?: boolean | null;
}
interface GraphAttachment {
  id?: string;
  name?: string | null;
  contentType?: string | null;
  size?: number | null;
}
interface DeltaResponse {
  value?: Array<{ id?: string; "@removed"?: unknown }>;
  "@odata.nextLink"?: string;
  "@odata.deltaLink"?: string;
}
interface MessagesListResponse<T = { id?: string }> {
  value?: T[];
}

function parseRecipient(recipient: GraphRecipient | null | undefined): { address: string; name: string | null } | null {
  const email = recipient?.emailAddress;
  const address = email?.address?.trim().toLowerCase();
  if (!address) return null;
  return { address, name: email?.name?.trim() || null };
}

function parseRecipientList(recipients: GraphRecipient[] | null | undefined): Array<{ address: string; name: string | null }> {
  return (recipients ?? [])
    .map(parseRecipient)
    .filter((r): r is { address: string; name: string | null } => r !== null);
}

/** Map Graph attachment metadata into the provider-neutral ProviderAttachment. Pure. */
export function parseGraphAttachment(att: GraphAttachment): ProviderAttachment {
  return {
    providerAttachmentId: att.id ?? "",
    filename: att.name?.trim() || null,
    contentType: att.contentType?.trim() || null,
    sizeBytes: typeof att.size === "number" ? att.size : null,
  };
}

/**
 * Map a Graph message resource into the provider-neutral ProviderMessage. Pure — no network, no DB.
 * `providerMessageId` is the stable Graph message id (needed for reply + dedup); `providerThreadId`
 * is the conversationId. `direction` is a best-effort default (inbound); the sync layer is
 * authoritative and recomputes it from the From address vs the mailbox address.
 */
export function parseGraphMessage(msg: GraphMessage): ProviderMessage {
  const from = parseRecipient(msg.from ?? msg.sender);
  const to = parseRecipientList(msg.toRecipients);
  const cc = parseRecipientList(msg.ccRecipients);

  const contentType = (msg.body?.contentType ?? "").toLowerCase();
  const content = msg.body?.content ?? null;
  const isHtml = contentType === "html";
  const bodyHtml = isHtml ? content?.trim() || null : null;
  const bodyText = !isHtml ? content?.trim() || null : null;

  const preview = msg.bodyPreview?.trim() || bodyText || "";
  const snippet = preview ? preview.slice(0, 200) : null;

  const rawSentAt = msg.receivedDateTime ? new Date(msg.receivedDateTime) : null;
  const sentAt = rawSentAt && !Number.isNaN(rawSentAt.getTime()) ? rawSentAt : null;

  return {
    providerMessageId: msg.id ?? "",
    providerThreadId: msg.conversationId ?? "",
    direction: "inbound",
    from,
    to,
    cc,
    subject: msg.subject ?? null,
    bodyText,
    bodyHtml,
    snippet,
    sentAt,
    attachments: [],
  };
}

// ─── Graph message builders (send / draft) ───────────────────────────────────────

function toRecipient(address: string): GraphRecipient {
  return { emailAddress: { address } };
}

/** Prefer the HTML body when present; fall back to plain text. */
function buildMessageBody(input: SendReplyInput): { contentType: "HTML" | "Text"; content: string } {
  if (input.bodyHtml) return { contentType: "HTML", content: input.bodyHtml };
  return { contentType: "Text", content: input.bodyText };
}

/** A full Graph message resource for draft creation. */
function buildGraphMessage(input: SendReplyInput): Record<string, unknown> {
  return {
    subject: input.subject,
    body: buildMessageBody(input),
    toRecipients: input.to.map(toRecipient),
    ccRecipients: (input.cc ?? []).map(toRecipient),
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────────

/** Escape single quotes for an OData string literal (`'` → `''`). */
function encodeODataString(value: string): string {
  return value.replace(/'/g, "''");
}

function isDeltaExpired(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const message = (err as { message?: unknown }).message;
  return typeof message === "string" && (message.includes("(410)") || message.includes("(400)"));
}
