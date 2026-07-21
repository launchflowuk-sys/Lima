import { Text, View } from "react-native";
import { radius, toneForStatus } from "@/constants/theme";

interface BadgeProps {
  /** Raw status string; resolved to a colour tone via the status map. */
  status: string | null | undefined;
  /** Override the displayed text (defaults to the humanised status label). */
  label?: string;
}

/** Accent-coloured pill driven by the status -> colour map in the theme. */
export function Badge({ status, label }: BadgeProps) {
  const tone = toneForStatus(status);
  const text = label ?? tone.label;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        backgroundColor: tone.bg,
        borderRadius: radius.full,
        paddingHorizontal: 10,
        paddingVertical: 4,
        gap: 6,
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tone.color }} />
      <Text style={{ color: tone.fg, fontSize: 12, fontWeight: "600" }}>{text}</Text>
    </View>
  );
}
