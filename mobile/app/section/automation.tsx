import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { api, type AutomationRule, type BusinessRef } from "@/lib/api";
import { AnimatedListItem, Badge, Card, EmptyState, Screen, ScreenHeader, SkeletonList } from "@/components/ui";
import { colors, font } from "@/constants/theme";

/** Summarise unknown-shaped condition/action JSON into a readable count. */
function summarise(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") return Object.keys(value as object).length;
  return 0;
}

export default function Automation() {
  const [businesses, setBusinesses] = useState<BusinessRef[]>([]);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await api.automation();
      setBusinesses(data.businesses);
      setRules(data.rules);
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
        title="Automation"
        subtitle={loading ? "Loading…" : `${rules.length} rules`}
      />

      {loading ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          <SkeletonList count={4} />
        </View>
      ) : (
        <FlatList
          data={rules}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            error ? (
              <EmptyState icon="alert-triangle" title="Couldn't load automation" subtitle={error} />
            ) : (
              <EmptyState icon="zap" title="No automation rules" subtitle="Rules that auto-tag, escalate or controlled-auto-send replies are configured on desktop and appear here." />
            )
          }
          renderItem={({ item, index }) => {
            const conds = summarise(item.conditions);
            const acts = summarise(item.actions);
            return (
              <AnimatedListItem index={index}>
                <Card style={{ marginBottom: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: colors.amber + "1A", alignItems: "center", justifyContent: "center" }}>
                      <Feather name="zap" size={16} color={colors.amber} />
                    </View>
                    <Text style={{ flex: 1, fontFamily: font.bold, fontSize: 15.5, color: colors.ink }} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Badge
                      label={item.isActive ? "Active" : "Paused"}
                      fg={item.isActive ? colors.emerald : colors.inkSoft}
                      bg={item.isActive ? "#ECFDF5" : "#F1F5F9"}
                      dot
                    />
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                    <Badge label={`Priority ${item.priority}`} fg={colors.primary} bg={colors.primarySoft} />
                    <Badge label={`${conds} ${conds === 1 ? "condition" : "conditions"}`} fg={colors.sky} bg="#E0F2FE" />
                    <Badge label={`${acts} ${acts === 1 ? "action" : "actions"}`} fg={colors.violet} bg="#F5F3FF" />
                    {item.stopOnMatch ? <Badge label="Stop on match" fg={colors.inkSoft} bg="#F1F5F9" /> : null}
                  </View>
                  {bizName(item.businessId) ? (
                    <Text style={{ fontFamily: font.regular, fontSize: 12.5, color: colors.inkMuted, marginTop: 10 }} numberOfLines={1}>
                      {bizName(item.businessId)}
                    </Text>
                  ) : null}
                </Card>
              </AnimatedListItem>
            );
          }}
        />
      )}
    </Screen>
  );
}
