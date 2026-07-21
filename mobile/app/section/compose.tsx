import { PlaceholderSection } from "@/components/ui";
import { colors } from "@/constants/theme";

export default function Compose() {
  return (
    <PlaceholderSection
      title="Compose"
      subtitle="New reply"
      icon="edit-3"
      color={colors.primary}
      description="Agent Lima drafts replies for you automatically. Incoming enquiries are classified, drafted in your business's voice, and queued in Approvals for a quick review before sending."
      bullets={[
        { icon: "inbox", text: "New mail is synced and read automatically" },
        { icon: "cpu", text: "The agent drafts a reply in your voice" },
        { icon: "check-circle", text: "Review and send it from Approvals" },
        { icon: "zap", text: "Or let controlled auto-send handle the safe ones" },
      ]}
    />
  );
}
