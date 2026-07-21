import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Alert, FlatList, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { api, type Draft } from "@/lib/api";
import {
  AnimatedListItem,
  Badge,
  Button,
  Card,
  EmptyState,
  Screen,
  SectionHeader,
  SkeletonList,
} from "@/components/ui";
import { colors, font, radius } from "@/constants/theme";

export default function Approvals() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<{ id: string; kind: "approve" | "reject" } | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const { drafts } = await api.approvals();
      setDrafts(drafts);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function act(id: string, kind: "approve" | "reject") {
    setBusy({ id, kind });
    try {
      if (kind === "approve") await api.approve(id, edits[id]);
      else await api.reject(id);
      setDrafts((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      Alert.alert(kind === "approve" ? "Send failed" : "Reject failed", e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen>
      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <SectionHeader
          title="Approvals"
          subtitle={loading ? "Loading drafts…" : drafts.length ? `${drafts.length} awaiting review` : "Draft replies to review"}
        />
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: 20 }}>
          <SkeletonList count={3} />
        </View>
      ) : (
        <FlatList
          data={drafts}
          keyExtractor={(d) => d.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={() => load(true)}
          ListEmptyComponent={
            <EmptyState
              icon="check-circle"
              title="Nothing to approve"
              subtitle="AI-drafted replies waiting on you will show up here."
            />
          }
          renderItem={({ item, index }) => {
            const isBusy = busy?.id === item.id;
            return (
              <AnimatedListItem index={index}>
                <Card style={{ marginBottom: 14 }}>
                  <Text style={{ fontFamily: font.bold, fontSize: 16, color: colors.ink }} numberOfLines={2}>
                    {item.threadSubject || item.subject || "(no subject)"}
                  </Text>

                  {item.autoSendBlockedReason ? (
                    <View style={{ marginTop: 8 }}>
                      <Badge
                        label={`Needs a human · ${item.autoSendBlockedReason}`}
                        fg={colors.amber}
                        bg="#FFFBEB"
                      />
                    </View>
                  ) : (
                    <View style={{ marginTop: 8 }}>
                      <Badge label="AI drafted" fg={colors.violet} bg="#F5F3FF" dot />
                    </View>
                  )}

                  <View
                    style={{
                      marginTop: 14,
                      backgroundColor: colors.canvas,
                      borderRadius: radius.lg,
                      padding: 14,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <Feather name="edit-2" size={13} color={colors.inkMuted} />
                      <Text style={{ fontFamily: font.semibold, fontSize: 12, color: colors.inkMuted }}>
                        Draft reply — tap to edit
                      </Text>
                    </View>
                    <TextInput
                      multiline
                      defaultValue={item.bodyText}
                      onChangeText={(t) => setEdits((e) => ({ ...e, [item.id]: t }))}
                      style={{
                        minHeight: 110,
                        fontFamily: font.regular,
                        fontSize: 15,
                        color: colors.ink,
                        lineHeight: 22,
                        textAlignVertical: "top",
                      }}
                    />
                  </View>

                  <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
                    <Button
                      label="Approve & send"
                      icon="send"
                      onPress={() => act(item.id, "approve")}
                      loading={isBusy && busy?.kind === "approve"}
                      disabled={isBusy}
                      style={{ flex: 1 }}
                      full={false}
                    />
                    <Button
                      label="Reject"
                      variant="secondary"
                      onPress={() => act(item.id, "reject")}
                      loading={isBusy && busy?.kind === "reject"}
                      disabled={isBusy}
                      full={false}
                      style={{ width: 120 }}
                    />
                  </View>
                </Card>
              </AnimatedListItem>
            );
          }}
        />
      )}
    </Screen>
  );
}
