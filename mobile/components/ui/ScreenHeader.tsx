import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { colors, font } from "@/constants/theme";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  /** Solid surface bar with a bottom hairline (used by the thread reader). */
  bar?: boolean;
}

/** Detail-screen header with a rounded back button and title. */
export function ScreenHeader({ title, subtitle, right, bar = false }: ScreenHeaderProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingBottom: 14,
        ...(bar
          ? {
              backgroundColor: colors.surface,
              borderBottomWidth: 1,
              borderBottomColor: colors.line,
            }
          : {}),
      }}
    >
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/(app)/dashboard"))}
        hitSlop={10}
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: bar ? colors.canvas : colors.surface,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Feather name="arrow-left" size={20} color={colors.ink} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: font.bold, fontSize: 19, color: colors.ink }} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ fontFamily: font.regular, fontSize: 13, color: colors.inkMuted }} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}
