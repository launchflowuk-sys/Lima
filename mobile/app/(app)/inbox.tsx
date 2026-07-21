import { useCallback, useState } from "react";
import { useFocusEffect, router } from "expo-router";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { api, type Thread } from "@/lib/api";
import { Screen, Card, Badge, Skeleton, AnimatedListItem, EmptyState } from "@/components/ui";
import { colors, spacing, toneForStatus } from "@/constants/theme";

function formatWhen(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = Date.now();
  const diff = Math.max(0, now - d.getTime());
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

function ThreadRow({ item, index }: { item: Thread; index: number }) {
  const tone = toneForStatus(item.status);
  return (
    <AnimatedListItem index={index}>
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <Card onPress={() => router.push(`/thread/${item.id}`)} accent={item.isRead ? undefined : tone.color}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            {!item.isRead ? (
              <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary }} />
            ) : null}
            <Text
              style={{ flex: 1, fontSize: 16, fontWeight: item.isRead ? "500" : "800", color: colors.ink }}
              numberOfLines={1}
            >
              {item.subject || "(no subject)"}
            </Text>
            {item.lastMessageAt ? (
              <Text style={{ fontSize: 12, color: colors.inkMuted }}>{formatWhen(item.lastMessageAt)}</Text>
            ) : null}
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.md }}>
            <Text style={{ fontSize: 13, color: colors.inkSoft, flex: 1 }} numberOfLines={1}>
              {item.businessName}
            </Text>
            <Badge status={item.status} />
          </View>
        </Card>
      </View>
    </AnimatedListItem>
  );
}

function LoadingSkeletons() {
  return (
    <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: spacing.lg,
            marginBottom: spacing.md,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <Skeleton width={9} height={9} rounded={5} />
            <View style={{ flex: 1 }}>
              <Skeleton width="70%" height={16} />
            </View>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: spacing.md }}>
            <Skeleton width="40%" height={13} />
            <Skeleton width={64} height={20} rounded={999} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function Inbox() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
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
      setInitialLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const unread = threads.filter((t) => !t.isRead).length;

  return (
    <Screen
      header={{
        title: "Inbox",
        subtitle: initialLoading
          ? "Loading your conversations…"
          : unread > 0
            ? `${unread} unread of ${threads.length}`
            : `${threads.length} conversations`,
      }}
    >
      {error ? (
        <View style={{ marginHorizontal: spacing.lg, marginTop: spacing.md, backgroundColor: "#FFF1F2", borderRadius: 12, padding: spacing.md }}>
          <Text style={{ color: "#BE123C", fontWeight: "500" }}>{error}</Text>
        </View>
      ) : null}

      {initialLoading ? (
        <LoadingSkeletons />
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: spacing.xl, flexGrow: 1 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primary} colors={[colors.primary]} />
          }
          renderItem={({ item, index }) => <ThreadRow item={item} index={index} />}
          ListEmptyComponent={
            <EmptyState
              emoji="📭"
              title="All caught up"
              message="No conversations yet. When customers email in, Agent Lima will handle them here. Pull down to refresh."
            />
          }
        />
      )}
    </Screen>
  );
}
