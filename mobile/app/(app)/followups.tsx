import { View } from "react-native";
import { EmptyState, Screen, SectionHeader } from "@/components/ui";

export default function FollowUps() {
  return (
    <Screen>
      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <SectionHeader title="Follow-ups" subtitle="Scheduled and pending replies" />
      </View>
      <EmptyState
        icon="clock"
        title="No follow-ups scheduled"
        subtitle="When Agent Lima queues a reply to send later, it'll appear here so you can track and adjust it."
      />
    </Screen>
  );
}
