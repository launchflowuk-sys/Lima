import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { api, type BusinessRef, type Contact } from "@/lib/api";
import { AnimatedListItem, Avatar, Card, EmptyState, Screen, ScreenHeader, SkeletonList } from "@/components/ui";
import { colors, font, relativeTime } from "@/constants/theme";

export default function Contacts() {
  const [businesses, setBusinesses] = useState<BusinessRef[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await api.contacts();
      setBusinesses(data.businesses);
      setContacts(data.contacts);
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

  const bizName = useMemo(() => {
    const map = new Map(businesses.map((b) => [b.id, b.name]));
    return (id: string) => map.get(id) ?? "";
  }, [businesses]);

  return (
    <Screen edges={["top"]}>
      <ScreenHeader
        title="Contacts"
        subtitle={loading ? "Loading…" : `${contacts.length} people`}
      />

      {loading ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          <SkeletonList count={5} />
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            error ? (
              <EmptyState icon="alert-triangle" title="Couldn't load contacts" subtitle={error} />
            ) : (
              <EmptyState icon="users" title="No contacts yet" subtitle="People who email your connected inboxes will build up here as customer memory." />
            )
          }
          renderItem={({ item, index }) => (
            <AnimatedListItem index={index}>
              <Card style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: "row", gap: 14 }}>
                  <Avatar name={item.name || item.email} size={46} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={{ flex: 1, fontFamily: font.bold, fontSize: 15.5, color: colors.ink }} numberOfLines={1}>
                        {item.name || item.email}
                      </Text>
                      <Text style={{ fontFamily: font.medium, fontSize: 12, color: colors.inkMuted }}>
                        {relativeTime(item.lastSeenAt)}
                      </Text>
                    </View>
                    <Text style={{ fontFamily: font.regular, fontSize: 13.5, color: colors.inkSoft, marginTop: 2 }} numberOfLines={1}>
                      {item.email}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 }}>
                      <Text style={{ fontFamily: font.semibold, fontSize: 12, color: colors.primary }}>
                        {item.messageCount} {item.messageCount === 1 ? "message" : "messages"}
                      </Text>
                      {bizName(item.businessId) ? (
                        <Text style={{ fontFamily: font.regular, fontSize: 12, color: colors.inkMuted }} numberOfLines={1}>
                          · {bizName(item.businessId)}
                        </Text>
                      ) : null}
                    </View>
                    {item.notes ? (
                      <Text style={{ fontFamily: font.regular, fontSize: 13, color: colors.inkSoft, marginTop: 8, lineHeight: 19 }} numberOfLines={2}>
                        {item.notes}
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
