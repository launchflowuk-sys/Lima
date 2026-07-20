import { useCallback, useState } from "react";
import { useFocusEffect, router } from "expo-router";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { api, type Thread } from "@/lib/api";

export default function Inbox() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const { threads } = await api.inbox();
      setThreads(threads);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      {error ? <Text style={{ color: "#dc2626", padding: 16 }}>{error}</Text> : null}
      <FlatList
        data={threads}
        keyExtractor={(t) => t.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        ListEmptyComponent={
          !refreshing ? <Text style={{ textAlign: "center", color: "#94a3b8", marginTop: 48 }}>Nothing here yet. Pull to refresh.</Text> : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/thread/${item.id}`)}
            style={{ backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {!item.isRead ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#2563eb" }} /> : null}
              <Text style={{ flex: 1, fontSize: 15, fontWeight: item.isRead ? "400" : "700", color: "#0f172a" }} numberOfLines={1}>
                {item.subject || "(no subject)"}
              </Text>
            </View>
            <Text style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }} numberOfLines={1}>
              {item.businessName} · {item.status.replace(/_/g, " ")}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}
