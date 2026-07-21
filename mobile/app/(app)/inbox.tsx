import { useCallback, useState } from "react";
import { useFocusEffect, router } from "expo-router";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { api, type Thread } from "@/lib/api";
import {
  AnimatedListItem,
  Avatar,
  Badge,
  Card,
  EmptyState,
  FAB,
  Screen,
  SectionHeader,
  SkeletonList,
} from "@/components/ui";
import { colors, font, relativeTime, statusTone } from "@/constants/theme";

export default function Inbox() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const { threads } = await api.inbox();
      setThreads(threads);
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

  const unread = threads.filter((t) => !t.isRead).length;

  return (
    <Screen>
      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <SectionHeader
          title="Inbox"
          subtitle={
            loading
              ? "Loading conversations…"
              : unread > 0
                ? `${unread} unread of ${threads.length}`
                : `${threads.length} conversations`
          }
        />
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: 20 }}>
          <SkeletonList count={6} />
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            error ? (
              <EmptyState icon="alert-triangle" title="Couldn't load your inbox" subtitle={error} />
            ) : (
              <EmptyState
                icon="inbox"
                title="You're all caught up"
                subtitle="New conversations will appear here. Pull down to refresh."
              />
            )
          }
          renderItem={({ item, index }) => {
            const tone = statusTone(item.status);
            return (
              <AnimatedListItem index={index}>
                <Card onPress={() => router.push(`/thread/${item.id}`)} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", gap: 14 }}>
                    <Avatar name={item.businessName} size={48} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text
                          style={{
                            flex: 1,
                            fontFamily: item.isRead ? font.semibold : font.bold,
                            fontSize: 15.5,
                            color: colors.ink,
                          }}
                          numberOfLines={1}
                        >
                          {item.businessName}
                        </Text>
                        <Text style={{ fontFamily: font.medium, fontSize: 12, color: colors.inkMuted }}>
                          {relativeTime(item.lastMessageAt)}
                        </Text>
                        {!item.isRead ? (
                          <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary }} />
                        ) : null}
                      </View>
                      <Text
                        style={{
                          fontFamily: item.isRead ? font.regular : font.semibold,
                          fontSize: 14.5,
                          color: item.isRead ? colors.inkSoft : colors.ink,
                          marginTop: 3,
                        }}
                        numberOfLines={1}
                      >
                        {item.subject || "(no subject)"}
                      </Text>
                      <View style={{ marginTop: 10 }}>
                        <Badge label={tone.label} fg={tone.fg} bg={tone.bg} dot />
                      </View>
                    </View>
                  </View>
                </Card>
              </AnimatedListItem>
            );
          }}
        />
      )}

      <FAB icon="edit-3" onPress={() => router.push("/section/compose")} />
    </Screen>
  );
}
