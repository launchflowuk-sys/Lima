import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { api, type BusinessRef, type KnowledgeEntry } from "@/lib/api";
import { AnimatedListItem, Badge, Card, EmptyState, Screen, ScreenHeader, SkeletonList } from "@/components/ui";
import { colors, font } from "@/constants/theme";

export default function Knowledge() {
  const [businesses, setBusinesses] = useState<BusinessRef[]>([]);
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await api.knowledge();
      setBusinesses(data.businesses);
      setEntries(data.entries);
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
        title="Knowledge"
        subtitle={loading ? "Loading…" : `${entries.length} approved facts`}
      />

      {loading ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          <SkeletonList count={5} />
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            error ? (
              <EmptyState icon="alert-triangle" title="Couldn't load knowledge" subtitle={error} />
            ) : (
              <EmptyState icon="book-open" title="No knowledge yet" subtitle="Approved facts and documents that train the agent's replies will appear here." />
            )
          }
          renderItem={({ item, index }) => (
            <AnimatedListItem index={index}>
              <Card style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: colors.violet + "1A", alignItems: "center", justifyContent: "center" }}>
                    <Feather name="book-open" size={16} color={colors.violet} />
                  </View>
                  <Text style={{ flex: 1, fontFamily: font.bold, fontSize: 15.5, color: colors.ink }} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {!item.isActive ? <Badge label="Inactive" fg={colors.inkSoft} bg="#F1F5F9" /> : null}
                </View>
                <Text style={{ fontFamily: font.regular, fontSize: 14, color: colors.inkSoft, lineHeight: 20 }} numberOfLines={3}>
                  {item.content}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 }}>
                  <Badge label={item.kind} fg={colors.violet} bg="#F5F3FF" />
                  {item.priority > 0 ? <Badge label={`Priority ${item.priority}`} fg={colors.amber} bg="#FFFBEB" /> : null}
                  {bizName(item.businessId) ? (
                    <Text style={{ fontFamily: font.regular, fontSize: 12, color: colors.inkMuted }} numberOfLines={1}>
                      {bizName(item.businessId)}
                    </Text>
                  ) : null}
                </View>
              </Card>
            </AnimatedListItem>
          )}
        />
      )}
    </Screen>
  );
}
