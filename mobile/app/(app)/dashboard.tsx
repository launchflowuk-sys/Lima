import { useCallback, useState } from "react";
import { useFocusEffect, router } from "expo-router";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { api, type AnalyticsReport, type DashboardStats } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  AnimatedListItem,
  Card,
  EmptyState,
  Screen,
  SectionHeader,
  Skeleton,
  StatTile,
} from "@/components/ui";
import { colors, font } from "@/constants/theme";

const GAP = 12;

function pct(rate: number | null): string {
  if (rate === null) return "—";
  return `${Math.round(rate * 100)}%`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const { stats, report } = await api.analytics();
      setStats(stats);
      setReport(report);
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

  const greeting = user?.firstName ? `Hi ${user.firstName}` : "Dashboard";

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <SectionHeader title={greeting} subtitle="Today at a glance" />

        {loading ? (
          <DashboardSkeleton />
        ) : error ? (
          <EmptyState icon="alert-triangle" title="Couldn't load your dashboard" subtitle={error} />
        ) : stats && !stats.hasBusiness ? (
          <EmptyState
            icon="briefcase"
            title="No business connected yet"
            subtitle="Connect a business and mailbox on the desktop app to start seeing live numbers here."
          />
        ) : stats && report ? (
          <View>
            {/* Hero — full width */}
            <AnimatedListItem index={0}>
              <StatTile
                hero
                tone="blue"
                icon="inbox"
                label="Emails received today"
                value={stats.emailsReceivedToday}
                hint={`${stats.repliesSentToday} replies sent today`}
                style={{ minHeight: 150, marginBottom: GAP }}
              />
            </AnimatedListItem>

            {/* Row of two */}
            <AnimatedListItem index={1}>
              <View style={{ flexDirection: "row", gap: GAP, marginBottom: GAP }}>
                <StatTile
                  tone="amber"
                  icon="check-circle"
                  label="Awaiting approval"
                  value={stats.awaitingApproval}
                  onPress={() => router.push("/(app)/approvals")}
                  style={{ flex: 1, minHeight: 132 }}
                />
                <StatTile
                  tone="red"
                  icon="alert-circle"
                  label="Needs attention"
                  value={stats.needsAttention}
                  onPress={() => router.push("/(app)/inbox")}
                  style={{ flex: 1, minHeight: 132 }}
                />
              </View>
            </AnimatedListItem>

            {/* Mixed — tall left + two stacked right */}
            <AnimatedListItem index={2}>
              <View style={{ flexDirection: "row", gap: GAP, marginBottom: GAP }}>
                <StatTile
                  tone="violet"
                  icon="zap"
                  label="Auto-send rate today"
                  value={pct(stats.autoSendRate)}
                  hint={`${stats.autoSentToday} sent automatically`}
                  style={{ flex: 1, minHeight: 176, justifyContent: "space-between" }}
                />
                <View style={{ flex: 1, gap: GAP }}>
                  <StatTile
                    tone="green"
                    icon="send"
                    label="Replies sent today"
                    value={stats.repliesSentToday}
                    style={{ flex: 1, minHeight: 82 }}
                  />
                  <StatTile
                    tone="ink"
                    icon="flag"
                    label="Escalated"
                    value={stats.escalated}
                    style={{ flex: 1, minHeight: 82 }}
                  />
                </View>
              </View>
            </AnimatedListItem>

            {/* Follow-ups — full width */}
            <AnimatedListItem index={3}>
              <StatTile
                tone="sky"
                icon="clock"
                label="Follow-ups due today"
                value={stats.followUpsDueToday}
                onPress={() => router.push("/(app)/followups")}
                style={{ minHeight: 104, marginBottom: GAP + 6 }}
              />
            </AnimatedListItem>

            {/* Top intents (last 30 days) */}
            <AnimatedListItem index={4}>
              <Card style={{ marginBottom: GAP }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <Feather name="bar-chart-2" size={16} color={colors.primary} />
                  <Text style={{ fontFamily: font.bold, fontSize: 15, color: colors.ink }}>
                    Top intents · last {report.windowDays} days
                  </Text>
                </View>
                {report.intentBreakdown.length === 0 ? (
                  <Text style={{ fontFamily: font.regular, fontSize: 13.5, color: colors.inkMuted }}>
                    No classified emails yet in this window.
                  </Text>
                ) : (
                  <IntentBars data={report.intentBreakdown} />
                )}
              </Card>
            </AnimatedListItem>

            {/* Window totals */}
            <AnimatedListItem index={5}>
              <Card>
                <Text style={{ fontFamily: font.bold, fontSize: 15, color: colors.ink, marginBottom: 12 }}>
                  Last {report.windowDays} days
                </Text>
                <SummaryRow icon="download" label="Received" value={String(report.totalReceived)} tint={colors.sky} />
                <SummaryRow icon="send" label="Sent" value={String(report.totalSent)} tint={colors.emerald} />
                <SummaryRow icon="zap" label="Auto-send rate" value={pct(report.autoSendRate)} tint={colors.violet} />
                <SummaryRow
                  icon="dollar-sign"
                  label="Est. AI cost"
                  value={`$${report.estimatedAiCostUsd.toFixed(2)}`}
                  tint={colors.amber}
                  last
                />
              </Card>
            </AnimatedListItem>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function IntentBars({ data }: { data: Array<{ intent: string; count: number }> }) {
  const top = data.slice(0, 5);
  const max = Math.max(...top.map((d) => d.count), 1);
  return (
    <View style={{ gap: 12 }}>
      {top.map((d) => (
        <View key={d.intent}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: colors.ink, textTransform: "capitalize" }}>
              {d.intent.replace(/_/g, " ")}
            </Text>
            <Text style={{ fontFamily: font.bold, fontSize: 13, color: colors.inkSoft }}>{d.count}</Text>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.canvas, overflow: "hidden" }}>
            <View style={{ width: `${(d.count / max) * 100}%`, height: "100%", borderRadius: 4, backgroundColor: colors.primary }} />
          </View>
        </View>
      ))}
    </View>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  tint,
  last,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  tint: string;
  last?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 11,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.line,
      }}
    >
      <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: tint + "1A", alignItems: "center", justifyContent: "center" }}>
        <Feather name={icon} size={16} color={tint} />
      </View>
      <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 14.5, color: colors.inkSoft }}>{label}</Text>
      <Text style={{ fontFamily: font.bold, fontSize: 15.5, color: colors.ink }}>{value}</Text>
    </View>
  );
}

function DashboardSkeleton() {
  return (
    <View>
      <Skeleton width="100%" height={150} radius={24} style={{ marginBottom: GAP }} />
      <View style={{ flexDirection: "row", gap: GAP, marginBottom: GAP }}>
        <Skeleton width="48%" height={132} radius={24} />
        <Skeleton width="48%" height={132} radius={24} />
      </View>
      <View style={{ flexDirection: "row", gap: GAP, marginBottom: GAP }}>
        <Skeleton width="48%" height={176} radius={24} />
        <Skeleton width="48%" height={176} radius={24} />
      </View>
      <Skeleton width="100%" height={104} radius={24} style={{ marginBottom: GAP }} />
      <Skeleton width="100%" height={160} radius={24} />
    </View>
  );
}
