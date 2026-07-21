import { router, useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { Screen } from "@/components/ui";
import { findSection } from "@/constants/sections";
import { colors, font, radius } from "@/constants/theme";

function titleize(key: string): string {
  return key.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function SectionScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const section = findSection(key);
  const title = section?.title ?? titleize(key ?? "Section");
  const subtitle = section?.subtitle ?? "This section is on the way";
  const icon = section?.icon ?? "layers";
  const color = section?.color ?? colors.primary;

  return (
    <Screen edges={["top"]}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 8 }}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather name="arrow-left" size={20} color={colors.ink} />
        </Pressable>
      </View>

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
        <Animated.View entering={FadeIn.duration(180)} style={{ alignItems: "center" }}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: radius["3xl"],
              backgroundColor: color + "1A",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            <Feather name={icon} size={40} color={color} />
          </View>
          <Text style={{ fontFamily: font.extrabold, fontSize: 28, color: colors.ink, letterSpacing: -0.5 }}>
            {title}
          </Text>
          <Text
            style={{
              fontFamily: font.regular,
              fontSize: 15.5,
              color: colors.inkMuted,
              textAlign: "center",
              marginTop: 8,
              lineHeight: 23,
            }}
          >
            {subtitle}
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 7,
              backgroundColor: colors.primarySoft,
              borderRadius: radius.pill,
              paddingHorizontal: 14,
              paddingVertical: 8,
              marginTop: 24,
            }}
          >
            <Feather name="clock" size={14} color={colors.primary} />
            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: colors.primary }}>Coming soon</Text>
          </View>
        </Animated.View>
      </View>
    </Screen>
  );
}
