import { Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { colors, font } from "@/constants/theme";

interface EmptyStateProps {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon = "inbox", title, subtitle }: EmptyStateProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(160)}
      style={{ alignItems: "center", justifyContent: "center", paddingVertical: 64, paddingHorizontal: 32 }}
    >
      <View
        style={{
          width: 84,
          height: 84,
          borderRadius: 42,
          backgroundColor: colors.primarySoft,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        }}
      >
        <Feather name={icon} size={34} color={colors.primary} />
      </View>
      <Text style={{ fontFamily: font.bold, fontSize: 18, color: colors.ink, textAlign: "center" }}>
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={{
            fontFamily: font.regular,
            fontSize: 14.5,
            color: colors.inkMuted,
            textAlign: "center",
            marginTop: 8,
            lineHeight: 21,
          }}
        >
          {subtitle}
        </Text>
      ) : null}
    </Animated.View>
  );
}
