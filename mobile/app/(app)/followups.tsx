import { useCallback, useState } from "react";
import { useFocusEffect, router } from "expo-router";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { api, type FollowUp } from "@/lib/api";
import {
  AnimatedListItem,
  Badge,
  Card,
  EmptyState,
  Screen,
  SectionHeader,
  SkeletonList,
} from "@/components/ui";
import { colors, font } from "@/constants/theme";

function dueLabel(iso: string | null): { text: string; overdue: boolean } {
  if (!iso) return { text: "No due date", overdue: false };
  const due = new Date(iso).getTime();
  if (Number.isNaN(due)) return { text: "No due date", overdue: false };
  const diff = due - Date.now();
  const overdue = diff < 0;
  const abs = Math.abs(diff);
  const days = Math.floor(abs / 86400000);
  const hours = Math.floor(abs / 3600000);
  const rel = days >= 1 ? `${days}d` : hours >= 1 ? `${hours}h` : "soon";
  return { text: overdue ? `Overdue by ${rel}` : `Due in ${rel}`, overdue };
}

export default function FollowUps() {
  const [items, setItems] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const { followUps } = await api.followUps();
      setItems(followUps);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
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

  return (
    <Screen>
      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <SectionHeader
          title="Follow-ups"
          subtitle={loading ? "Loading…" : items.length ? `${items.length} pending` : "Scheduled replies"}
        />
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: 20 }}>
          <SkeletonList count={4} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(f) => f.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            error ? (
              <EmptyState icon="alert-triangle" title="Couldn't load follow-ups" subtitle={error} />
            ) : (
              <EmptyState
                icon="clock"
                title="No follow-ups scheduled"
                subtitle="When Agent Lima queues a reply to send later, it'll appear here so you can track and adjust it."
              />
            )
          }
          renderItem={({ item, index }) => {
            const due = dueLabel(item.dueAt);
            return (
              <AnimatedListItem index={index}>
                <Card
                  onPress={item.threadId ? () => router.push(`/thread/${item.threadId}`) : undefined}
                  style={{ marginBottom: 12 }}
                >
                  <View style={{ flexDirection: "row", gap: 14 }}>
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        backgroundColor: due.overdue ? "#FFF1F2" : colors.primarySoft,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Feather name="clock" size={20} color={due.overdue ? colors.rose : colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: font.bold, fontSize: 15.5, color: colors.ink }} numberOfLines={1}>
                        {item.threadSubject || "Follow-up"}
                      </Text>
                      {item.reason ? (
                        <Text style={{ fontFamily: font.regular, fontSize: 14, color: colors.inkSoft, marginTop: 3 }} numberOfLines={2}>
                          {item.reason}
                        </Text>
                      ) : null}
                      <View style={{ marginTop: 10 }}>
                        <Badge
                          label={due.text}
                          fg={due.overdue ? colors.rose : colors.primary}
                          bg={due.overdue ? "#FFF1F2" : colors.primarySoft}
                          dot
                        />
                      </View>
                    </View>
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
