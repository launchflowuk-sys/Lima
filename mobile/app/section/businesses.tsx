import { PlaceholderSection } from "@/components/ui";
import { colors } from "@/constants/theme";

export default function Businesses() {
  return (
    <PlaceholderSection
      title="Businesses"
      subtitle="Connected accounts"
      icon="briefcase"
      color={colors.primary}
      description="Each business is an isolated workspace with its own inboxes, tone of voice, knowledge and automation. Agent Lima keeps every tenant's data cleanly separated."
      bullets={[
        { icon: "shield", text: "Strict tenant isolation across all data" },
        { icon: "mail", text: "Its own connected mailboxes and senders" },
        { icon: "edit-3", text: "A distinct brand voice and signature" },
        { icon: "book-open", text: "Dedicated knowledge base and rules" },
      ]}
    />
  );
}
