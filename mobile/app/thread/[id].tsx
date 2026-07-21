import { useCallback, useState } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { api, type Message, type Thread } from "@/lib/api";
import { Avatar, Badge, EmptyState, Screen, Skeleton } from "@/components/ui";
import { colors, font, radius, relativeTime, shadow, statusTone } from "@/constants/theme";

export default function ThreadScreen() {
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

  const tone = thread ? statusTone(thread.status) : null;

  return (
    <Screen edges={["top"]}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 16,
          paddingBottom: 14,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.line,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.canvas,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather name="arrow-left" size={20} color={colors.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.bold, fontSize: 17, color: colors.ink }} numberOfLines={1}>
            {thread?.subject || "Thread"}
          </Text>
          {thread ? (
            <Text style={{ fontFamily: font.regular, fontSize: 13, color: colors.inkMuted }} numberOfLines={1}>
              {thread.businessName}
            </Text>
          ) : null}
        </View>
        {tone ? <Badge label={tone.label} fg={tone.fg} bg={tone.bg} dot /> : null}
      </View>

      {loading ? (
        <View style={{ padding: 20, gap: 16 }}>
          <Skeleton width="70%" height={70} radius={radius.xl} />
          <View style={{ alignItems: "flex-end" }}>
            <Skeleton width="60%" height={60} radius={radius.xl} />
          </View>
          <Skeleton width="80%" height={80} radius={radius.xl} />
        </View>
      ) : error ? (
        <EmptyState icon="alert-triangle" title="Couldn't load thread" subtitle={error} />
      ) : messages.length === 0 ? (
        <EmptyState icon="message-square" title="No messages yet" subtitle="This conversation is empty." />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 4 }}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((m, index) => {
            const outbound = m.direction === "outbound";
            return (
              <Animated.View
                key={m.id}
                entering={FadeInDown.springify().damping(18).delay(Math.min(index, 8) * 45)}
                style={{ alignItems: outbound ? "flex-end" : "flex-start", marginBottom: 12, maxWidth: "100%" }}
              >
                <View style={{ flexDirection: outbound ? "row-reverse" : "row", alignItems: "flex-end", gap: 8, maxWidth: "88%" }}>
                  <Avatar name={outbound ? "Agent Lima" : m.fromName || m.fromAddress} size={32} />
                  <View
                    style={[
                      {
                        backgroundColor: outbound ? colors.primary : colors.surface,
                        borderRadius: radius.xl,
                        borderBottomRightRadius: outbound ? 6 : radius.xl,
                        borderBottomLeftRadius: outbound ? radius.xl : 6,
                        padding: 14,
                        flexShrink: 1,
                      },
                      shadow.soft,
                    ]}
                  >
                    <Text
                      style={{
                        fontFamily: font.semibold,
                        fontSize: 12.5,
                        color: outbound ? "rgba(255,255,255,0.85)" : colors.inkMuted,
                        marginBottom: 4,
                      }}
                      numberOfLines={1}
                    >
                      {outbound ? "You" : m.fromName || m.fromAddress || "Unknown"}
                    </Text>
                    <Text
                      style={{
                        fontFamily: font.regular,
                        fontSize: 15,
                        lineHeight: 22,
                        color: outbound ? "#fff" : colors.ink,
                      }}
                    >
                      {m.bodyText || m.snippet || "(no content)"}
                    </Text>
                    <Text
                      style={{
                        fontFamily: font.regular,
                        fontSize: 11,
                        color: outbound ? "rgba(255,255,255,0.7)" : colors.inkMuted,
                        marginTop: 6,
                        alignSelf: "flex-end",
                      }}
                    >
                      {relativeTime(m.sentAt)}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}
