import type { InferSelectModel } from "drizzle-orm";
import type { mailboxes } from "@/server/db/schema";

export type Mailbox = InferSelectModel<typeof mailboxes>;

/** Thrown by provider methods not yet implemented in the current build phase. Honest, not fake. */
export class ProviderNotImplementedError extends Error {
  constructor(provider: string, method: string) {
    super(`${provider} provider: ${method}() is not implemented yet`);
    this.name = "ProviderNotImplementedError";
  }
}

export interface ProviderAttachment {
  providerAttachmentId: string;
  filename: string | null;
  contentType: string | null;
  sizeBytes: number | null;
}

export interface ProviderMessage {
  providerMessageId: string;
  providerThreadId: string;
  direction: "inbound" | "outbound";
  from: { address: string; name?: string | null } | null;
  to: Array<{ address: string; name?: string | null }>;
  cc: Array<{ address: string; name?: string | null }>;
  subject: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  snippet: string | null;
  sentAt: Date | null;
  attachments: ProviderAttachment[];
}

export interface ProviderThread {
  providerThreadId: string;
  subject: string | null;
  messages: ProviderMessage[];
}

export interface SendReplyInput {
  providerThreadId: string;
  inReplyToProviderMessageId?: string;
  to: string[];
  cc?: string[];
  subject: string;
  bodyText: string;
  bodyHtml?: string;
}

export interface SendResult {
  providerMessageId: string;
}

export interface SyncResult {
  /** Provider message ids that are new/changed since the given cursor. */
  changedMessageIds: string[];
  /** Opaque cursor to persist for the next incremental sync (historyId / deltaToken / uid). */
  cursor: string | null;
}

export interface WatchResult {
  subscriptionId: string | null;
  clientState?: string | null;
  expiresAt: Date | null;
  cursor: string | null;
}

/**
 * The single contract every inbox type implements — Gmail, Microsoft Graph, and the generic
 * IMAP/SMTP provider. The rest of the system (sync jobs, inbox UI, send flow) depends ONLY on this
 * interface, never on a specific provider, so adding a new inbox type is a new adapter and nothing
 * else. Implementations receive the mailbox record and are responsible for decrypting their own
 * credentials via security/encryption.ts.
 */
export interface EmailProvider {
  readonly kind: "gmail" | "microsoft" | "imap_smtp";

  /** Verify the stored credentials are usable (used on connect + health checks). */
  verifyConnection(): Promise<void>;

  /** Incremental change list since `cursor` (null = initial sync). */
  listChanges(cursor: string | null): Promise<SyncResult>;

  fetchThread(providerThreadId: string): Promise<ProviderThread>;
  fetchMessage(providerMessageId: string): Promise<ProviderMessage>;

  /** Save a draft in the provider without sending. */
  createDraft(input: SendReplyInput): Promise<{ providerDraftId: string }>;

  /** Send a reply. The ONLY method that dispatches mail — callers gate it behind approval/auto-send. */
  sendReply(input: SendReplyInput): Promise<SendResult>;

  /** Register/renew push notifications where the provider supports them (no-op for pure IMAP). */
  watch(): Promise<WatchResult>;
  unwatch(): Promise<void>;
}
