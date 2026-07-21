import { Alert, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth";
import { AnimatedListItem, Avatar, Button, Card, Screen, SectionHeader } from "@/components/ui";
import { MENU_GROUPS, type SectionDef } from "@/constants/sections";
import { colors, font } from "@/constants/theme";

export default function Menu() {
  const { user, signOut } = useAuth();
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "Your account";

  function open(section: SectionDef) {
    if (section.route) router.push(section.route as never);
    else router.push(`/section/${section.key}`);
  }

  function confirmSignOut() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => signOut() },
    ]);
  }

  let rowIndex = 0;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader title="Menu" subtitle="Everything in your workspace" />

        <AnimatedListItem index={0}>
          <Card style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <Avatar name={fullName} size={52} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.bold, fontSize: 17, color: colors.ink }} numberOfLines={1}>
                  {fullName}
                </Text>
                <Text style={{ fontFamily: font.regular, fontSize: 13.5, color: colors.inkMuted }} numberOfLines={1}>
                  {user?.email}
                  {user?.isOwner ? " · Owner" : ""}
                </Text>
              </View>
            </View>
          </Card>
        </AnimatedListItem>

        {MENU_GROUPS.map((group) => (
          <View key={group.heading} style={{ marginBottom: 22 }}>
            <Text
              style={{
                fontFamily: font.bold,
                fontSize: 12.5,
                color: colors.inkMuted,
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 10,
                marginLeft: 4,
              }}
            >
              {group.heading}
            </Text>
            <View style={{ gap: 10 }}>
              {group.items.map((item) => {
                const idx = rowIndex++;
                return (
                  <AnimatedListItem key={item.key} index={idx}>
                    <Card onPress={() => open(item)} padded={false}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 14 }}>
                        <View
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 14,
                            backgroundColor: item.color + "1A",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Feather name={item.icon} size={20} color={item.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <Text style={{ fontFamily: font.semibold, fontSize: 15.5, color: colors.ink }}>
                              {item.title}
                            </Text>
                            {item.built ? null : (
                              <View
                                style={{
                                  backgroundColor: colors.canvas,
                                  borderRadius: 999,
                                  paddingHorizontal: 8,
                                  paddingVertical: 2,
                                }}
                              >
                                <Text style={{ fontFamily: font.semibold, fontSize: 10, color: colors.inkMuted }}>
                                  Soon
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text style={{ fontFamily: font.regular, fontSize: 13, color: colors.inkMuted, marginTop: 1 }}>
                            {item.subtitle}
                          </Text>
                        </View>
                        <Feather name="chevron-right" size={20} color={colors.inkMuted} />
                      </View>
                    </Card>
                  </AnimatedListItem>
                );
              })}
            </View>
          </View>
        ))}

        <Button label="Sign out" variant="secondary" icon="log-out" onPress={confirmSignOut} />
      </ScrollView>
    </Screen>
  );
}
