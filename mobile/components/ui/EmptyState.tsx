import { Text, View } from "react-native";
import { MotiView } from "moti";
import { fonts, spacing } from "@/constants/theme";
import { useColors } from "@/lib/theme";

interface EmptyStateProps {
  /** Uppercase micro-label above the heading. */
  kicker?: string;
  title: string;
  message?: string;
}

/** Editorial empty-state — a flat blue mark, heavy heading, restrained copy. */
export function EmptyState({ kicker = "Nothing here", title, message }: EmptyStateProps) {
  const c = useColors();
  return (
    <MotiView
      from={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 300 }}
      style={{ alignItems: "flex-start", paddingHorizontal: spacing.xl, paddingTop: spacing["3xl"] }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md }}>
        <View style={{ width: 14, height: 14, backgroundColor: c.primary }} />
        <Text
          style={{
            fontFamily: fonts.heading,
            fontSize: 10,
            letterSpacing: 0.12 * 10,
            textTransform: "uppercase",
            color: c.primary,
          }}
        >
          {kicker}
        </Text>
      </View>

      <Text style={{ fontFamily: fonts.heading, fontSize: 25, color: c.text, letterSpacing: -0.3 }}>{title}</Text>
      {message ? (
        <Text style={{ fontFamily: fonts.body, fontSize: 14, color: c.textMuted, marginTop: 8, lineHeight: 21 }}>
          {message}
        </Text>
      ) : null}
    </MotiView>
  );
}
