import nodemailer from "nodemailer";
import type { EmailProvider, Mailbox, ProviderThread, ProviderMessage, SendReplyInput, SendResult, SyncResult, WatchResult } from "./types";
import { ProviderNotImplementedError } from "./types";
import { decryptSecret } from "@/server/security/encryption";

/**
 * Generic IMAP/SMTP adapter — the "connect any inbox" provider (cPanel, Zoho, Fastmail, private
 * business domains, most client mailboxes). Read via IMAP (imapflow), send via SMTP (nodemailer).
 * Passwords are stored encrypted on the mailbox row and decrypted here on demand.
 *
 * verifyConnection + sendReply are implemented (self-contained). IMAP polling sync + thread fetch
 * land in the IMAP phase (BUILD_PROGRESS) — pure IMAP has no push, so `watch` is a documented no-op
 * and changes are discovered by a scheduled poll of listChanges.
 */
export class ImapSmtpProvider implements EmailProvider {
  readonly kind = "imap_smtp" as const;
  constructor(private readonly mailbox: Mailbox) {}

  private smtpTransport() {
    const m = this.mailbox;
    if (!m.smtpHost || !m.smtpPort || !m.smtpUsername || !m.smtpPasswordEnc) {
      throw new Error("SMTP is not fully configured for this mailbox");
    }
    return nodemailer.createTransport({
      host: m.smtpHost,
      port: m.smtpPort,
      secure: m.smtpSecure ?? true,
      auth: { user: m.smtpUsername, pass: decryptSecret(m.smtpPasswordEnc) },
    });
  }

  async verifyConnection(): Promise<void> {
    // SMTP is the one both send + most hosts expose; verifying it proves the credentials work.
    await this.smtpTransport().verify();
  }

  async sendReply(input: SendReplyInput): Promise<SendResult> {
    const info = await this.smtpTransport().sendMail({
      from: { name: this.mailbox.displayName ?? "", address: this.mailbox.emailAddress },
      to: input.to,
      cc: input.cc,
      subject: input.subject,
      text: input.bodyText,
      html: input.bodyHtml,
      inReplyTo: input.inReplyToProviderMessageId,
      references: input.inReplyToProviderMessageId,
    });
    return { providerMessageId: info.messageId };
  }

  async listChanges(_cursor: string | null): Promise<SyncResult> {
    throw new ProviderNotImplementedError("imap_smtp", "listChanges");
  }
  async fetchThread(_id: string): Promise<ProviderThread> {
    throw new ProviderNotImplementedError("imap_smtp", "fetchThread");
  }
  async fetchMessage(_id: string): Promise<ProviderMessage> {
    throw new ProviderNotImplementedError("imap_smtp", "fetchMessage");
  }
  async createDraft(_input: SendReplyInput): Promise<{ providerDraftId: string }> {
    throw new ProviderNotImplementedError("imap_smtp", "createDraft");
  }

  /** Pure IMAP has no push channel; discovery is by scheduled poll of listChanges. */
  async watch(): Promise<WatchResult> {
    return { subscriptionId: null, expiresAt: null, cursor: null };
  }
  async unwatch(): Promise<void> {
    /* no-op */
  }
}
