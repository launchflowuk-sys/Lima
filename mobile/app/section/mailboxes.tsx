import { PlaceholderSection } from "@/components/ui";
import { colors } from "@/constants/theme";

export default function Mailboxes() {
  return (
    <PlaceholderSection
      title="Mailboxes"
      subtitle="Connected inboxes"
      icon="mail"
      color={colors.rose}
      description="Connect Gmail, Microsoft 365 or any IMAP/SMTP inbox. Agent Lima syncs new mail, drafts replies in your voice, and can send under strict controlled-auto-send rules."
      bullets={[
        { icon: "inbox", text: "Gmail, Microsoft 365 and any IMAP/SMTP inbox" },
        { icon: "refresh-cw", text: "Automatic background sync of new mail" },
        { icon: "lock", text: "Credentials encrypted at rest (AES-256-GCM)" },
        { icon: "zap", text: "Draft-only or controlled auto-send per mailbox" },
      ]}
    />
  );
}
