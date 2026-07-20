import type { EmailProvider, Mailbox, ProviderThread, ProviderMessage, SendReplyInput, SendResult, SyncResult, WatchResult } from "./types";
import { ProviderNotImplementedError } from "./types";

/**
 * Gmail adapter (Gmail API + OAuth2 + Pub/Sub watch). Contract-complete skeleton — the network
 * implementation lands in the Gmail phase (BUILD_PROGRESS: Phase 2). Credentials are the mailbox's
 * encrypted OAuth tokens, decrypted on demand; never logged, never returned to the client.
 */
export class GmailProvider implements EmailProvider {
  readonly kind = "gmail" as const;
  constructor(private readonly mailbox: Mailbox) {}

  async verifyConnection(): Promise<void> {
    throw new ProviderNotImplementedError("gmail", "verifyConnection");
  }
  async listChanges(_cursor: string | null): Promise<SyncResult> {
    throw new ProviderNotImplementedError("gmail", "listChanges");
  }
  async fetchThread(_id: string): Promise<ProviderThread> {
    throw new ProviderNotImplementedError("gmail", "fetchThread");
  }
  async fetchMessage(_id: string): Promise<ProviderMessage> {
    throw new ProviderNotImplementedError("gmail", "fetchMessage");
  }
  async createDraft(_input: SendReplyInput): Promise<{ providerDraftId: string }> {
    throw new ProviderNotImplementedError("gmail", "createDraft");
  }
  async sendReply(_input: SendReplyInput): Promise<SendResult> {
    throw new ProviderNotImplementedError("gmail", "sendReply");
  }
  async watch(): Promise<WatchResult> {
    throw new ProviderNotImplementedError("gmail", "watch");
  }
  async unwatch(): Promise<void> {
    throw new ProviderNotImplementedError("gmail", "unwatch");
  }
}
