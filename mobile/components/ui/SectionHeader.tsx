import { Text, View } from "react-native";
import { colors, font } from "@/constants/theme";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

/** Large bold screen / section title block. */
export function SectionHeader({ title, subtitle, right }: SectionHeaderProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
        marginBottom: 18,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: font.extrabold, fontSize: 30, color: colors.ink, letterSpacing: -0.5 }}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ fontFamily: font.regular, fontSize: 14.5, color: colors.inkMuted, marginTop: 4 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}
