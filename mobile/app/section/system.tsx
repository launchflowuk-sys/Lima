import { PlaceholderSection } from "@/components/ui";
import { colors } from "@/constants/theme";

export default function System() {
  return (
    <PlaceholderSection
      title="System health"
      subtitle="Status & uptime"
      icon="activity"
      color={colors.emerald}
      description="Agent Lima runs an autonomous pipeline — mailbox sync, classification, drafting and delivery — on background queues. This section surfaces the health of those services."
      bullets={[
        { icon: "refresh-cw", text: "Background sync and draft-generation queues" },
        { icon: "cpu", text: "AI classification and drafting workers" },
        { icon: "database", text: "Database and Redis connectivity" },
        { icon: "bell", text: "Notification delivery channels" },
      ]}
    />
  );
}
