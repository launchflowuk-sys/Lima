import { useCallback, useState } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { api, type Message, type Thread } from "@/lib/api";
import { Loader } from "@/components/ui";
import { fonts, spacing } from "@/constants/theme";
import { useColors } from "@/lib/theme";

export default function ThreadScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.thread(id);
      setThread(data.thread);
      setMessages(data.messages);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style="dark" />

      {/* Modernist header — back arrow + subject over a 2px section rule. */}
      <View
        style={{
          paddingTop: insets.top + spacing.md,
          paddingBottom: spacing.md,
          paddingHorizontal: spacing.xl,
          borderBottomWidth: 2,
          borderBottomColor: c.dividerStrong,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={22} color={c.text} />
        </Pressable>
        <Text style={{ flex: 1, fontFamily: fonts.heading, fontSize: 20, color: c.text }} numberOfLines={1}>
          {thread?.subject || "Thread"}
        </Text>
      </View>

      {loading ? (
        <View style={{ alignItems: "center", marginTop: spacing["3xl"] }}>
          <Loader />
        </View>
      ) : error ? (
        <Text style={{ color: c.danger, fontFamily: fonts.medium, padding: spacing.lg }}>{error}</Text>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}>
          {messages.map((m) => {
            const outbound = m.direction === "outbound";
            return (
              <View
                key={m.id}
                style={{
                  borderWidth: outbound ? 2 : 1,
                  borderColor: outbound ? c.primary : c.divider,
                  borderRadius: 0,
                  padding: spacing.lg,
                  backgroundColor: c.surface,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: c.text }} numberOfLines={1}>
                    {m.fromName || m.fromAddress || "Unknown"}
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.heading,
                      fontSize: 9,
                      letterSpacing: 0.12 * 9,
                      textTransform: "uppercase",
                      color: outbound ? c.primary : c.textMuted,
                    }}
                  >
                    {m.direction}
                  </Text>
                </View>
                <Text style={{ color: c.textSoft, fontFamily: fonts.body, marginTop: 8, lineHeight: 20, fontSize: 13.5 }}>
                  {m.bodyText || m.snippet || "(no content)"}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
