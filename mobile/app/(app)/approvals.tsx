import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, Text, TextInput, View } from "react-native";
import { api, type Draft } from "@/lib/api";

export default function Approvals() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const { drafts } = await api.approvals();
      setDrafts(drafts);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to load");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function act(id: string, kind: "approve" | "reject") {
    setBusyId(id);
    try {
      if (kind === "approve") await api.approve(id, edits[id]);
      else await api.reject(id);
      setDrafts((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      Alert.alert(kind === "approve" ? "Send failed" : "Reject failed", e instanceof Error ? e.message : "Error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <FlatList
        data={drafts}
        keyExtractor={(d) => d.id}
        contentContainerStyle={{ padding: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        ListEmptyComponent={
          !refreshing ? <Text style={{ textAlign: "center", color: "#94a3b8", marginTop: 48 }}>Nothing to approve.</Text> : null
        }
        renderItem={({ item }) => (
          <View style={{ backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 14, marginBottom: 12 }}>
            <Text style={{ fontWeight: "700", color: "#0f172a" }} numberOfLines={1}>{item.threadSubject || "(no subject)"}</Text>
            {item.autoSendBlockedReason ? (
              <Text style={{ color: "#d97706", fontSize: 12, marginTop: 2 }}>Needs a human: {item.autoSendBlockedReason}</Text>
            ) : null}
            <TextInput
              multiline
              defaultValue={item.bodyText}
              onChangeText={(t) => setEdits((e) => ({ ...e, [item.id]: t }))}
              style={{ marginTop: 10, minHeight: 120, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, padding: 10, fontSize: 14, textAlignVertical: "top" }}
            />
            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              <Pressable
                onPress={() => act(item.id, "approve")}
                disabled={busyId === item.id}
                style={{ flex: 1, backgroundColor: "#2563eb", borderRadius: 8, paddingVertical: 12, alignItems: "center", opacity: busyId === item.id ? 0.6 : 1 }}
              >
                {busyId === item.id ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700" }}>Approve & send</Text>}
              </Pressable>
              <Pressable
                onPress={() => act(item.id, "reject")}
                disabled={busyId === item.id}
                style={{ borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, alignItems: "center" }}
              >
                <Text style={{ color: "#475569", fontWeight: "600" }}>Reject</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </View>
  );
}
