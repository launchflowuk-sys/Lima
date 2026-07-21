import type { ReactNode } from "react";
import { View, Text, type ViewStyle } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, gradients, spacing } from "@/constants/theme";

interface ScreenProps {
  children: ReactNode;
  /** Render a gradient brand header at the top of the screen. */
  header?: {
    title: string;
    subtitle?: string;
    right?: ReactNode;
  };
  /** Background colour for the scroll/body area. Defaults to warm canvas. */
  background?: string;
  contentStyle?: ViewStyle;
}

/**
 * SafeArea-aware themed screen wrapper with an optional gradient brand header.
 * The header consumes the top inset itself so content sits flush under it.
 */
export function Screen({ children, header, background = colors.canvas, contentStyle }: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: background }}>
      <StatusBar style={header ? "light" : "dark"} />

      {header ? (
        <LinearGradient
          colors={gradients.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: insets.top + spacing.md,
            paddingBottom: spacing.xl,
            paddingHorizontal: spacing.xl,
            borderBottomLeftRadius: 28,
            borderBottomRightRadius: 28,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.white, fontSize: 26, fontWeight: "800", letterSpacing: -0.5 }}>
                {header.title}
              </Text>
              {header.subtitle ? (
                <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, marginTop: 2 }}>
                  {header.subtitle}
                </Text>
              ) : null}
            </View>
            {header.right ? <View style={{ marginLeft: spacing.md }}>{header.right}</View> : null}
          </View>
        </LinearGradient>
      ) : (
        <View style={{ height: insets.top }} />
      )}

      <View style={[{ flex: 1 }, contentStyle]}>{children}</View>
    </View>
  );
}
