import { PlaceholderSection } from "@/components/ui";
import { colors } from "@/constants/theme";

export default function Audit() {
  return (
    <PlaceholderSection
      title="Audit"
      subtitle="Activity log"
      icon="file-text"
      color={colors.inkSoft}
      description="Every meaningful action is recorded — who did what, when, and why. Approvals, sends, auto-sends, rule matches and settings changes are all traceable."
      bullets={[
        { icon: "check-circle", text: "Draft approvals and rejections" },
        { icon: "send", text: "Sends and controlled auto-sends" },
        { icon: "zap", text: "Which automation rule matched and why" },
        { icon: "settings", text: "Configuration and access changes" },
      ]}
    />
  );
}
