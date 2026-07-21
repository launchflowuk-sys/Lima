import { PlaceholderSection } from "@/components/ui";
import { colors } from "@/constants/theme";

export default function Team() {
  return (
    <PlaceholderSection
      title="Team"
      subtitle="Members & roles"
      icon="user-plus"
      color={colors.primary}
      description="Invite teammates and grant them access to specific businesses. Role-based permissions control who can review drafts, configure automation, and manage mailboxes."
      bullets={[
        { icon: "users", text: "Invite members by email" },
        { icon: "shield", text: "Role-based access per business" },
        { icon: "check-circle", text: "Control who can approve and send" },
        { icon: "settings", text: "Manage tone, knowledge and automation rights" },
      ]}
    />
  );
}
