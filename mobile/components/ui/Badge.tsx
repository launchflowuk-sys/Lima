import { Text, View } from "react-native";
import { fonts, statusMeta, tagColors, type TagVariant } from "@/constants/theme";
import { useColors } from "@/lib/theme";

interface BadgeProps {
  /** Raw status string; resolved to a variant + label via the status map. */
  status?: string | null;
  /** Force a specific tag variant (overrides status-derived variant). */
  variant?: TagVariant;
  /** Override the displayed text (defaults to the humanised status label). */
  label?: string;
}

/**
 * Small squared status tag (not a rounded pill). Filled blue for primary
 * emphasis, outline for neutral/urgent — red reserved for escalated/urgent.
 */
export function Badge({ status, variant, label }: BadgeProps) {
  const c = useColors();
  const meta = statusMeta(status);
  const resolved = variant ?? meta.variant;
  const tag = tagColors(resolved, c);
  const text = label ?? meta.label;

  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: tag.bg,
        borderWidth: tag.bg === "transparent" ? 1 : 0,
        borderColor: tag.border,
        borderRadius: 0,
        paddingHorizontal: 8,
        paddingVertical: 3,
      }}
    >
      <Text
        style={{
          color: tag.fg,
          fontSize: 11,
          fontFamily: fonts.medium,
          letterSpacing: 0.02 * 11,
        }}
      >
        {text}
      </Text>
    </View>
  );
}
