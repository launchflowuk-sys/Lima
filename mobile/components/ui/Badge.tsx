import { Text, View, type ViewStyle } from "react-native";
import { font, radius } from "@/constants/theme";

interface BadgeProps {
  label: string;
  fg: string;
  bg: string;
  style?: ViewStyle;
  dot?: boolean;
}

/** Small rounded status pill. */
export function Badge({ label, fg, bg, style, dot = false }: BadgeProps) {
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          alignSelf: "flex-start",
          backgroundColor: bg,
          borderRadius: radius.pill,
          paddingHorizontal: 10,
          paddingVertical: 4,
        },
        style,
      ]}
    >
      {dot ? (
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: fg }} />
      ) : null}
      <Text
        style={{ color: fg, fontFamily: font.semibold, fontSize: 11.5, textTransform: "capitalize" }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}
