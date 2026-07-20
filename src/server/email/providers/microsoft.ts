import type { EmailProvider, Mailbox, ProviderThread, ProviderMessage, SendReplyInput, SendResult, SyncResult, WatchResult } from "./types";
import { ProviderNotImplementedError } from "./types";

/**
 * Microsoft 365 / Outlook adapter (Graph API + OAuth2 + Graph subscriptions + delta queries).
 * Contract-complete skeleton — network implementation lands in the Microsoft phase (Phase 3).
 */
export class MicrosoftProvider implements EmailProvider {
  readonly kind = "microsoft" as const;
  constructor(private readonly mailbox: Mailbox) {}

  async verifyConnection(): Promise<void> {
    throw new ProviderNotImplementedError("microsoft", "verifyConnection");
  }
  async listChanges(_cursor: string | null): Promise<SyncResult> {
    throw new ProviderNotImplementedError("microsoft", "listChanges");
  }
  async fetchThread(_id: string): Promise<ProviderThread> {
    throw new ProviderNotImplementedError("microsoft", "fetchThread");
  }
  async fetchMessage(_id: string): Promise<ProviderMessage> {
    throw new ProviderNotImplementedError("microsoft", "fetchMessage");
  }
  async createDraft(_input: SendReplyInput): Promise<{ providerDraftId: string }> {
    throw new ProviderNotImplementedError("microsoft", "createDraft");
  }
  async sendReply(_input: SendReplyInput): Promise<SendResult> {
    throw new ProviderNotImplementedError("microsoft", "sendReply");
  }
  async watch(): Promise<WatchResult> {
    throw new ProviderNotImplementedError("microsoft", "watch");
  }
  async unwatch(): Promise<void> {
    throw new ProviderNotImplementedError("microsoft", "unwatch");
  }
}
