import { Text, View } from "react-native";
import { MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients, spacing } from "@/constants/theme";

interface EmptyStateProps {
  emoji?: string;
  title: string;
  message?: string;
}

/** Friendly empty-state with a gradient emoji badge and warm copy. */
export function EmptyState({ emoji = "✨", title, message }: EmptyStateProps) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 400 }}
      style={{ alignItems: "center", paddingHorizontal: spacing.xl, paddingTop: spacing["3xl"] }}
    >
      <LinearGradient
        colors={gradients.brand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: 84,
          height: 84,
          borderRadius: 42,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: spacing.lg,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 6,
        }}
      >
        <Text style={{ fontSize: 38 }}>{emoji}</Text>
      </LinearGradient>

      <Text style={{ fontSize: 18, fontWeight: "800", color: colors.ink, textAlign: "center" }}>{title}</Text>
      {message ? (
        <Text style={{ fontSize: 14, color: colors.inkMuted, textAlign: "center", marginTop: 6, lineHeight: 20 }}>
          {message}
        </Text>
      ) : null}
    </MotiView>
  );
}
