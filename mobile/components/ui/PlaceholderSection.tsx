import { ScrollView, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { AnimatedListItem } from "./AnimatedListItem";
import { Card } from "./Card";
import { Screen } from "./Screen";
import { ScreenHeader } from "./ScreenHeader";
import { colors, font, radius } from "@/constants/theme";

interface PlaceholderSectionProps {
  title: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  description: string;
  /** Feature bullets describing what the section does. */
  bullets: { icon: keyof typeof Feather.glyphMap; text: string }[];
  /** Optional live stat rows (label + value) when we have something to show. */
  stats?: { label: string; value: string }[];
}

/** A tasteful, on-brand section screen for areas managed on desktop (not a bare "coming soon"). */
export function PlaceholderSection({
  title,
  subtitle,
  icon,
  color,
  description,
  bullets,
  stats,
}: PlaceholderSectionProps) {
  return (
    <Screen edges={["top"]}>
      <ScreenHeader title={title} subtitle={subtitle} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <AnimatedListItem index={0}>
          <Card style={{ marginBottom: 14 }}>
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: radius.xl,
                backgroundColor: color + "1A",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Feather name={icon} size={28} color={color} />
            </View>
            <Text style={{ fontFamily: font.bold, fontSize: 19, color: colors.ink, letterSpacing: -0.3 }}>{title}</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 14.5, color: colors.inkSoft, marginTop: 8, lineHeight: 22 }}>
              {description}
            </Text>
          </Card>
        </AnimatedListItem>

        {stats && stats.length > 0 ? (
          <AnimatedListItem index={1}>
            <Card style={{ marginBottom: 14 }}>
              {stats.map((s, i) => (
                <View
                  key={s.label}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingVertical: 11,
                    borderBottomWidth: i === stats.length - 1 ? 0 : 1,
                    borderBottomColor: colors.line,
                  }}
                >
                  <Text style={{ fontFamily: font.medium, fontSize: 14.5, color: colors.inkSoft }}>{s.label}</Text>
                  <Text style={{ fontFamily: font.bold, fontSize: 15.5, color: colors.ink }}>{s.value}</Text>
                </View>
              ))}
            </Card>
          </AnimatedListItem>
        ) : null}

        {/* Feature bullets */}
        <AnimatedListItem index={2}>
          <Card style={{ marginBottom: 14 }}>
            {bullets.map((b, i) => (
              <View
                key={i}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  paddingVertical: 12,
                  borderBottomWidth: i === bullets.length - 1 ? 0 : 1,
                  borderBottomColor: colors.line,
                }}
              >
                <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: color + "14", alignItems: "center", justifyContent: "center" }}>
                  <Feather name={b.icon} size={17} color={color} />
                </View>
                <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 14.5, color: colors.ink, lineHeight: 20 }}>
                  {b.text}
                </Text>
              </View>
            ))}
          </Card>
        </AnimatedListItem>

        {/* Manage-on-desktop note */}
        <AnimatedListItem index={3}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              backgroundColor: colors.primarySoft,
              borderRadius: radius.lg,
              paddingHorizontal: 16,
              paddingVertical: 14,
            }}
          >
            <Feather name="monitor" size={18} color={colors.primary} />
            <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 13.5, color: colors.primaryDark, lineHeight: 19 }}>
              Full management for this section lives in the Agent Lima desktop dashboard.
            </Text>
          </View>
        </AnimatedListItem>
      </ScrollView>
    </Screen>
  );
}
