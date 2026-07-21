import { Pressable, Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { StatusBar } from "expo-status-bar";
import { Screen, Button, Wordmark } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { fonts, spacing } from "@/constants/theme";
import { useColors, useTheme } from "@/lib/theme";

function Row({ label, value }: { label: string; value: string }) {
  const c = useColors();
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: c.divider,
      }}
    >
      <Text style={{ fontFamily: fonts.body, fontSize: 14, color: c.textSoft }}>{label}</Text>
      <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: c.text }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export default function Settings() {
  const c = useColors();
  const { scheme, toggle } = useTheme();
  const { user, signOut } = useAuth();

  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "—";

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Screen header={{ title: "Settings" }}>
        <View style={{ padding: spacing.xl }}>
          <Wordmark />

          <View style={{ height: 2, backgroundColor: c.dividerStrong, marginTop: spacing.lg, marginBottom: spacing.sm }} />

          <Row label="Name" value={name} />
          <Row label="Email" value={user?.email ?? "—"} />
          <Row label="Role" value={user?.isOwner ? "Owner" : "Member"} />

          {/* Appearance — demonstrates the light/dark token flip */}
          <Pressable
            onPress={toggle}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: c.divider,
            }}
          >
            <Text style={{ fontFamily: fonts.body, fontSize: 14, color: c.textSoft }}>Appearance</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Feather name={scheme === "dark" ? "moon" : "sun"} size={16} color={c.primary} />
              <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: c.text }}>
                {scheme === "dark" ? "Dark" : "Light"}
              </Text>
            </View>
          </Pressable>

          <View style={{ height: spacing["2xl"] }} />

          <Button label="Sign out" variant="secondary" onPress={signOut} block />

          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 11,
              color: c.textMuted,
              marginTop: spacing.xl,
              letterSpacing: 0.02 * 11,
            }}
          >
            Powered by LaunchFlow
          </Text>
        </View>
      </Screen>
    </View>
  );
}
