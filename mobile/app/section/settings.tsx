import { Alert, ScrollView, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth";
import { AnimatedListItem, Avatar, Button, Card, Screen, ScreenHeader } from "@/components/ui";
import { colors, font, radius } from "@/constants/theme";

export default function Settings() {
  const { user, signOut } = useAuth();
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "Your account";

  function confirmSignOut() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => signOut() },
    ]);
  }

  return (
    <Screen edges={["top"]}>
      <ScreenHeader title="Settings" subtitle="Your account" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <AnimatedListItem index={0}>
          <Card style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <Avatar name={fullName} size={60} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.bold, fontSize: 18, color: colors.ink }} numberOfLines={1}>
                  {fullName}
                </Text>
                <Text style={{ fontFamily: font.regular, fontSize: 13.5, color: colors.inkMuted, marginTop: 2 }} numberOfLines={1}>
                  {user?.email}
                </Text>
                {user?.isOwner ? (
                  <View
                    style={{
                      alignSelf: "flex-start",
                      backgroundColor: colors.primarySoft,
                      borderRadius: radius.pill,
                      paddingHorizontal: 10,
                      paddingVertical: 3,
                      marginTop: 8,
                    }}
                  >
                    <Text style={{ fontFamily: font.semibold, fontSize: 11.5, color: colors.primary }}>Owner</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </Card>
        </AnimatedListItem>

        {/* Details */}
        <AnimatedListItem index={1}>
          <Card style={{ marginBottom: 14 }}>
            <Row icon="mail" label="Email" value={user?.email ?? "—"} />
            <Row icon="user" label="Name" value={fullName} />
            <Row icon="shield" label="Role" value={user?.isOwner ? "Owner" : "Member"} last />
          </Card>
        </AnimatedListItem>

        {/* Appearance note (light-only) */}
        <AnimatedListItem index={2}>
          <Card style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.amber + "1A", alignItems: "center", justifyContent: "center" }}>
                <Feather name="sun" size={17} color={colors.amber} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 14.5, color: colors.ink }}>Appearance</Text>
                <Text style={{ fontFamily: font.regular, fontSize: 13, color: colors.inkMuted, marginTop: 1 }}>
                  Light theme — clean and easy on the eyes
                </Text>
              </View>
            </View>
          </Card>
        </AnimatedListItem>

        <Button label="Sign out" variant="secondary" icon="log-out" onPress={confirmSignOut} />

        <Text style={{ textAlign: "center", color: colors.inkMuted, fontFamily: font.regular, fontSize: 12.5, marginTop: 24 }}>
          Powered by LaunchFlow
        </Text>
      </ScrollView>
    </Screen>
  );
}

function Row({
  icon,
  label,
  value,
  last,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 12,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.line,
      }}
    >
      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.canvas, alignItems: "center", justifyContent: "center" }}>
        <Feather name={icon} size={17} color={colors.inkSoft} />
      </View>
      <Text style={{ fontFamily: font.medium, fontSize: 14.5, color: colors.inkSoft }}>{label}</Text>
      <Text style={{ flex: 1, textAlign: "right", fontFamily: font.semibold, fontSize: 14.5, color: colors.ink }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
