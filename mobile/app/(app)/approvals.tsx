import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Alert, FlatList, Text, TextInput, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { api, type Draft } from "@/lib/api";
import { Badge, Button, EmptyState } from "@/components/ui";
import { fonts, spacing } from "@/constants/theme";
import { useColors } from "@/lib/theme";

export default function Approvals() {
  const c = useColors();
  const insets = useSafeAreaInsets();
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
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style="dark" />
      <View
        style={{
          paddingTop: insets.top + spacing.md,
          paddingBottom: 14,
          paddingHorizontal: spacing.xl,
          borderBottomWidth: 2,
          borderBottomColor: c.dividerStrong,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 30, fontFamily: fonts.heading, color: c.text, letterSpacing: -0.4 }}>Approval</Text>
        {drafts.length > 0 ? (
          <View style={{ marginLeft: "auto" }}>
            <Badge variant="primary" label={`${drafts.length} pending`} />
          </View>
        ) : null}
      </View>

      <FlatList
        data={drafts}
        keyExtractor={(d) => d.id}
        contentContainerStyle={{ padding: spacing.xl, flexGrow: 1, gap: spacing.xl }}
        refreshing={refreshing}
        onRefresh={load}
        ListEmptyComponent={
          !refreshing ? (
            <EmptyState kicker="Approvals" title="Nothing to approve" message="Drafts awaiting your sign-off will appear here." />
          ) : null
        }
        renderItem={({ item }) => {
          const busy = busyId === item.id;
          return (
            <View>
              {/* Meta row */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: 10 }}>
                <Badge variant="neutral" label="Draft" />
                {item.autoSendBlockedReason ? <Badge variant="danger" label="needs a human" /> : null}
              </View>

              <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: c.text }} numberOfLines={2}>
                {item.threadSubject || "(no subject)"}
              </Text>
              {item.autoSendBlockedReason ? (
                <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: c.warning, marginTop: 4 }}>
                  {item.autoSendBlockedReason}
                </Text>
              ) : null}

              {/* Drafted reply label */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.lg, marginBottom: 10 }}>
                <View style={{ width: 14, height: 14, backgroundColor: c.primary }} />
                <Text
                  style={{
                    fontFamily: fonts.heading,
                    fontSize: 10,
                    letterSpacing: 0.12 * 10,
                    textTransform: "uppercase",
                    color: c.text,
                  }}
                >
                  Drafted reply
                </Text>
              </View>

              {/* Editable draft body — sharp 2px border box */}
              <TextInput
                multiline
                defaultValue={item.bodyText}
                onChangeText={(t) => setEdits((e) => ({ ...e, [item.id]: t }))}
                placeholderTextColor={c.textMuted}
                style={{
                  minHeight: 130,
                  borderWidth: 2,
                  borderColor: c.text,
                  borderRadius: 0,
                  padding: 16,
                  fontSize: 13.5,
                  fontFamily: fonts.body,
                  color: c.text,
                  backgroundColor: c.surface,
                  textAlignVertical: "top",
                }}
              />

              <View style={{ marginTop: spacing.md }}>
                <Button
                  label="Approve & send"
                  onPress={() => act(item.id, "approve")}
                  loading={busy}
                  block
                  rightIcon={<Feather name="arrow-right" size={16} color={c.primaryFg} />}
                />
              </View>
              <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.md }}>
                <Button label="Reject" variant="danger" onPress={() => act(item.id, "reject")} disabled={busy} style={{ flex: 1 }} />
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}
