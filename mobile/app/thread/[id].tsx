import { useCallback, useState } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { ScrollView, Text, useWindowDimensions, View } from "react-native";
import { api, type Message, type Thread } from "@/lib/api";
import {
  AnimatedListItem,
  Avatar,
  Badge,
  Button,
  EmptyState,
  HtmlBody,
  Screen,
  ScreenHeader,
  Skeleton,
} from "@/components/ui";
import { colors, font, radius, relativeTime, statusTone } from "@/constants/theme";

export default function ThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
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
  const bodyWidth = width - 84;

  return (
    <Screen edges={["top"]}>
      <ScreenHeader
        bar
        title={thread?.subject || "Thread"}
        subtitle={thread?.businessName}
        right={tone ? <Badge label={tone.label} fg={tone.fg} bg={tone.bg} dot /> : undefined}
      />

      {loading ? (
        <View style={{ padding: 20, gap: 16 }}>
          <Skeleton width="100%" height={130} radius={radius.xl} />
          <Skeleton width="100%" height={110} radius={radius.xl} />
          <Skeleton width="100%" height={150} radius={radius.xl} />
        </View>
      ) : error ? (
        <EmptyState icon="alert-triangle" title="Couldn't load thread" subtitle={error} />
      ) : messages.length === 0 ? (
        <EmptyState icon="message-square" title="No messages yet" subtitle="This conversation is empty." />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 14 }}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((m, index) => (
              <AnimatedListItem key={m.id} index={index}>
                <MessageCard message={m} bodyWidth={bodyWidth} />
              </AnimatedListItem>
            ))}
          </ScrollView>

          {/* Sticky bottom action bar */}
          <View
            style={{
              flexDirection: "row",
              gap: 12,
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 28,
              backgroundColor: colors.surface,
              borderTopWidth: 1,
              borderTopColor: colors.line,
            }}
          >
            <Button
              label="Reply"
              icon="corner-up-left"
              onPress={() => router.push("/(app)/approvals")}
              full={false}
              style={{ flex: 1 }}
            />
          </View>
        </>
      )}
    </Screen>
  );
}

function MessageCard({ message, bodyWidth }: { message: Message; bodyWidth: number }) {
  const outbound = message.direction === "outbound";
  const senderName = outbound ? "Agent Lima" : message.fromName || message.fromAddress || "Unknown sender";
  const senderAddress = outbound ? "Sent on your behalf" : message.fromAddress;

  return (
    <View
      style={{
        backgroundColor: outbound ? "#EFF6FF" : colors.surface,
        borderRadius: radius["2xl"],
        borderWidth: 1,
        borderColor: outbound ? "#DBEAFE" : colors.line,
        padding: 18,
      }}
    >
      {/* Header row */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <Avatar name={senderName} size={40} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ flex: 1, fontFamily: font.bold, fontSize: 14.5, color: colors.ink }} numberOfLines={1}>
              {senderName}
            </Text>
            <Text style={{ fontFamily: font.medium, fontSize: 12, color: colors.inkMuted }}>
              {relativeTime(message.sentAt)}
            </Text>
          </View>
          {senderAddress ? (
            <Text style={{ fontFamily: font.regular, fontSize: 12.5, color: colors.inkMuted, marginTop: 1 }} numberOfLines={1}>
              {senderAddress}
            </Text>
          ) : null}
        </View>
        {outbound ? (
          <Badge label="Sent" fg={colors.primary} bg="#DBEAFE" />
        ) : null}
      </View>

      {/* Body */}
      <HtmlBody html={message.bodyHtmlSanitized} text={message.bodyText || message.snippet} width={bodyWidth} />
    </View>
  );
}
