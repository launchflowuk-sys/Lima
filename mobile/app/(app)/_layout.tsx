import { Redirect, Tabs } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import { useAuth } from "@/lib/auth";
import { fonts } from "@/constants/theme";
import { useColors } from "@/lib/theme";

export default function AppLayout() {
  const { user, loading } = useAuth();
  const c = useColors();
  if (loading) return null;
  if (!user) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarStyle: {
          backgroundColor: c.bg,
          borderTopWidth: 2,
          borderTopColor: c.dividerStrong,
          elevation: 0,
          shadowOpacity: 0,
          height: 78,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 10, letterSpacing: 0.02 * 10 },
        tabBarItemStyle: { paddingVertical: 2 },
      }}
    >
      <Tabs.Screen
        name="inbox"
        options={{
          title: "Inbox",
          tabBarIcon: ({ color, size }) => <Feather name="inbox" size={size ?? 21} color={color} />,
        }}
      />
      <Tabs.Screen
        name="approvals"
        options={{
          title: "Approvals",
          tabBarIcon: ({ color, size }) => <Feather name="check-circle" size={size ?? 21} color={color} />,
        }}
      />
      <Tabs.Screen
        name="followups"
        options={{
          title: "Follow-ups",
          tabBarIcon: ({ color, size }) => <Feather name="clock" size={size ?? 21} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <Feather name="settings" size={size ?? 21} color={color} />,
        }}
      />
    </Tabs>
  );
}
