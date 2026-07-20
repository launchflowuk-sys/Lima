import type { EmailProvider, Mailbox } from "./types";
import { GmailProvider } from "./gmail";
import { MicrosoftProvider } from "./microsoft";
import { ImapSmtpProvider } from "./imap-smtp";

/**
 * Resolve the correct adapter for a mailbox from its `provider` column. This is the ONLY place that
 * knows the concrete provider classes — everything else works against the EmailProvider interface,
 * so supporting a new inbox type means adding a class and one case here.
 */
export function getProvider(mailbox: Mailbox): EmailProvider {
  switch (mailbox.provider) {
    case "gmail":
      return new GmailProvider(mailbox);
    case "microsoft":
      return new MicrosoftProvider(mailbox);
    case "imap_smtp":
      return new ImapSmtpProvider(mailbox);
    default: {
      const exhaustive: never = mailbox.provider;
      throw new Error(`Unknown mailbox provider: ${String(exhaustive)}`);
    }
  }
}
