import { Redirect, Tabs } from "expo-router";
import { useAuth } from "@/lib/auth";
import { colors } from "@/constants/theme";

export default function AppLayout() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.hairline },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.ink,
      }}
    >
      {/* Inbox renders its own gradient header via the Screen component. */}
      <Tabs.Screen name="inbox" options={{ title: "Inbox", headerShown: false }} />
      <Tabs.Screen name="approvals" options={{ title: "Approvals" }} />
    </Tabs>
  );
}
