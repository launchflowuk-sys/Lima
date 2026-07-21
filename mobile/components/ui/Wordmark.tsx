import { Text, View } from "react-native";
import { fonts } from "@/constants/theme";
import { useColors } from "@/lib/theme";

interface WordmarkProps {
  /** Size of the square blue mark; the wordmark scales with it. */
  markSize?: number;
  fontSize?: number;
  color?: string;
}

/** "AGENT LIMA" wordmark with the small BLUE square mark. */
export function Wordmark({ markSize = 22, fontSize = 14, color }: WordmarkProps) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View style={{ width: markSize, height: markSize, backgroundColor: c.primary }} />
      <Text
        style={{
          fontFamily: fonts.heading,
          fontSize,
          letterSpacing: -0.01 * fontSize,
          color: color ?? c.text,
        }}
      >
        AGENT LIMA
      </Text>
    </View>
  );
}
