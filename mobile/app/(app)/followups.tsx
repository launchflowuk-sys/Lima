import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Screen, EmptyState } from "@/components/ui";
import { useColors } from "@/lib/theme";

export default function FollowUps() {
  const c = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style="dark" />
      <Screen header={{ title: "Follow-ups", subtitle: "Chases Lima is scheduling on your behalf" }}>
        <EmptyState
          kicker="Follow-ups"
          title="Nothing scheduled"
          message="When a reply needs chasing, Agent Lima queues the follow-up here so nothing slips."
        />
      </Screen>
    </View>
  );
}
