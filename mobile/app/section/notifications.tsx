import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { api, type NotificationItem } from "@/lib/api";
import { AnimatedListItem, Card, EmptyState, Screen, ScreenHeader, SkeletonList } from "@/components/ui";
import { colors, font, relativeTime } from "@/constants/theme";

function iconFor(type: string): keyof typeof import("@expo/vector-icons").Feather.glyphMap {
  if (/approval|draft/i.test(type)) return "check-circle";
  if (/follow/i.test(type)) return "clock";
  if (/escalat|alert|attention/i.test(type)) return "alert-triangle";
  if (/sent|reply/i.test(type)) return "send";
  return "bell";
}

export default function Notifications() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await api.notifications();
      setItems(data.notifications);
      setUnread(data.unread);
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

  async function markAll() {
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await api.markAllNotifications();
    } catch {
      load();
    }
  }

  return (
    <Screen edges={["top"]}>
      <ScreenHeader
        title="Notifications"
        subtitle={loading ? "Loading…" : unread ? `${unread} unread` : "All caught up"}
        right={
          unread > 0 ? (
            <Pressable onPress={markAll} hitSlop={8} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 13, color: colors.primary }}>Mark all</Text>
            </Pressable>
          ) : undefined
        }
      />

      {loading ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          <SkeletonList count={5} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            error ? (
              <EmptyState icon="alert-triangle" title="Couldn't load notifications" subtitle={error} />
            ) : (
              <EmptyState icon="bell" title="No notifications" subtitle="Approvals, escalations and follow-up reminders will show up here." />
            )
          }
          renderItem={({ item, index }) => (
            <AnimatedListItem index={index}>
              <Card style={{ marginBottom: 10 }} padded={false}>
                <View style={{ flexDirection: "row", gap: 14, padding: 16 }}>
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      backgroundColor: item.isRead ? colors.canvas : colors.primarySoft,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Feather name={iconFor(item.type)} size={19} color={item.isRead ? colors.inkMuted : colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text
                        style={{ flex: 1, fontFamily: item.isRead ? font.semibold : font.bold, fontSize: 15, color: colors.ink }}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <Text style={{ fontFamily: font.medium, fontSize: 12, color: colors.inkMuted }}>
                        {relativeTime(item.createdAt)}
                      </Text>
                      {!item.isRead ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary }} /> : null}
                    </View>
                    {item.body ? (
                      <Text style={{ fontFamily: font.regular, fontSize: 14, color: colors.inkSoft, marginTop: 3, lineHeight: 20 }} numberOfLines={3}>
                        {item.body}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </Card>
            </AnimatedListItem>
          )}
        />
      )}
    </Screen>
  );
}
