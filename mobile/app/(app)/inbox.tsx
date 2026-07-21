import { useCallback, useState } from "react";
import { useFocusEffect, router } from "expo-router";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { api, type Thread } from "@/lib/api";
import { Badge, Skeleton, AnimatedListItem, EmptyState, Wordmark } from "@/components/ui";
import { fonts, spacing, statusAccent } from "@/constants/theme";
import { useColors } from "@/lib/theme";

function formatWhen(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function ThreadRow({ item, index }: { item: Thread; index: number }) {
  const c = useColors();
  const accent = statusAccent(item.status, c);
  const showStripe = !item.isRead;

  return (
    <AnimatedListItem index={index}>
      <Pressable
        onPress={() => router.push(`/thread/${item.id}`)}
        style={({ pressed }) => ({
          paddingVertical: 14,
          paddingHorizontal: spacing.xl,
          borderBottomWidth: 1,
          borderBottomColor: c.divider,
          borderLeftWidth: showStripe ? 3 : 0,
          borderLeftColor: accent,
          backgroundColor: pressed ? c.surface : "transparent",
        })}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm }}>
          <Text
            style={{ flex: 1, fontSize: 14, fontFamily: item.isRead ? fonts.body : fonts.medium, color: c.text }}
            numberOfLines={1}
          >
            {item.subject || "(no subject)"}
          </Text>
          {item.lastMessageAt ? (
            <Text style={{ fontSize: 11, fontFamily: fonts.body, color: c.textMuted }}>
              {formatWhen(item.lastMessageAt)}
            </Text>
          ) : null}
        </View>

        <Text
          style={{ fontSize: 12.5, fontFamily: fonts.body, color: c.textMuted, marginTop: 4, marginBottom: 8 }}
          numberOfLines={1}
        >
          {item.businessName}
        </Text>

        <Badge status={item.status} />
      </Pressable>
    </AnimatedListItem>
  );
}

function LoadingSkeletons() {
  const c = useColors();
  return (
    <View>
      {[0, 1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={{
            paddingVertical: 14,
            paddingHorizontal: spacing.xl,
            borderBottomWidth: 1,
            borderBottomColor: c.divider,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Skeleton width="60%" height={15} />
            <Skeleton width={44} height={12} />
          </View>
          <View style={{ marginTop: 8 }}>
            <Skeleton width="35%" height={12} />
          </View>
          <View style={{ marginTop: 10 }}>
            <Skeleton width={72} height={18} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function Inbox() {
  const c = useColors();
  const insets = useSafeAreaInsets();
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

  const activeBusiness = threads[0]?.businessName ?? "All businesses";

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style="dark" />

      {/* Editorial header — wordmark + business switcher, then the big title. */}
      <View
        style={{
          paddingTop: insets.top + spacing.md,
          paddingBottom: 14,
          paddingHorizontal: spacing.xl,
          borderBottomWidth: 2,
          borderBottomColor: c.dividerStrong,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <Wordmark />
          <View
            style={{
              marginLeft: "auto",
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              borderWidth: 1,
              borderColor: c.divider,
              paddingVertical: 4,
              paddingHorizontal: 10,
            }}
          >
            <Text style={{ fontSize: 12, fontFamily: fonts.body, color: c.text }} numberOfLines={1}>
              {activeBusiness}
            </Text>
            <Feather name="chevron-down" size={13} color={c.text} />
          </View>
        </View>
        <Text style={{ fontSize: 30, fontFamily: fonts.heading, color: c.text, letterSpacing: -0.4 }}>Inbox</Text>
      </View>

      {error ? (
        <View style={{ marginHorizontal: spacing.xl, marginTop: spacing.md, borderWidth: 1, borderColor: c.danger, padding: spacing.md }}>
          <Text style={{ color: c.danger, fontFamily: fonts.medium, fontSize: 13 }}>{error}</Text>
        </View>
      ) : null}

      {initialLoading ? (
        <LoadingSkeletons />
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ paddingBottom: spacing.xl, flexGrow: 1 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={load} tintColor={c.primary} colors={[c.primary]} />
          }
          renderItem={({ item, index }) => <ThreadRow item={item} index={index} />}
          ListEmptyComponent={
            <EmptyState
              kicker="All caught up"
              title="Inbox zero"
              message="No conversations yet. When customers email in, Agent Lima drafts replies here. Pull down to refresh."
            />
          }
        />
      )}
    </View>
  );
}
