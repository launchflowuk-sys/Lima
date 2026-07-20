import { Redirect, Tabs } from "expo-router";
import { useAuth } from "@/lib/auth";

export default function AppLayout() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Redirect href="/login" />;

  return (
    <Tabs screenOptions={{ headerShown: true, tabBarActiveTintColor: "#2563eb" }}>
      <Tabs.Screen name="inbox" options={{ title: "Inbox" }} />
      <Tabs.Screen name="approvals" options={{ title: "Approvals" }} />
    </Tabs>
  );
}
