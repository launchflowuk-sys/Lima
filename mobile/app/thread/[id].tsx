import { useCallback, useState } from "react";
import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { api, type Message, type Thread } from "@/lib/api";

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

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <Stack.Screen options={{ title: thread?.subject || "Thread", headerBackTitle: "Inbox" }} />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 48 }} />
      ) : error ? (
        <Text style={{ color: "#dc2626", padding: 16 }}>{error}</Text>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 12 }}>
          {messages.map((m) => (
            <View
              key={m.id}
              style={{
                backgroundColor: m.direction === "outbound" ? "#eff6ff" : "#fff",
                borderWidth: 1,
                borderColor: m.direction === "outbound" ? "#bfdbfe" : "#e2e8f0",
                borderRadius: 12,
                padding: 14,
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontWeight: "700", color: "#0f172a" }} numberOfLines={1}>
                  {m.fromName || m.fromAddress || "Unknown"}
                </Text>
                <Text style={{ color: "#94a3b8", fontSize: 12 }}>{m.direction}</Text>
              </View>
              <Text style={{ color: "#334155", marginTop: 8, lineHeight: 20 }}>{m.bodyText || m.snippet || "(no content)"}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
