import type { ReactNode } from "react";
import { View, Text, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts, spacing } from "@/constants/theme";
import { useColors } from "@/lib/theme";

interface ScreenProps {
  children: ReactNode;
  /** Optional flat editorial header (big Archivo title + 2px bottom rule). */
  header?: {
    title: string;
    subtitle?: string;
    right?: ReactNode;
  };
  /** Background override. Defaults to the palette ground. */
  background?: string;
  contentStyle?: ViewStyle;
}

/**
 * SafeArea-aware screen wrapper. The optional header is flat and modernist —
 * no gradient, no rounded corners — a heavy title over a 2px section rule.
 */
export function Screen({ children, header, background, contentStyle }: ScreenProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const bg = background ?? c.bg;

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {header ? (
        <View
          style={{
            paddingTop: insets.top + spacing.md,
            paddingBottom: spacing.lg,
            paddingHorizontal: spacing.xl,
            borderBottomWidth: 2,
            borderBottomColor: c.dividerStrong,
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.text, fontSize: 30, fontFamily: fonts.heading, letterSpacing: -0.4 }}>
              {header.title}
            </Text>
            {header.subtitle ? (
              <Text style={{ color: c.textMuted, fontSize: 13, fontFamily: fonts.body, marginTop: 4 }}>
                {header.subtitle}
              </Text>
            ) : null}
          </View>
          {header.right ? <View style={{ marginLeft: spacing.md }}>{header.right}</View> : null}
        </View>
      ) : (
        <View style={{ height: insets.top }} />
      )}

      <View style={[{ flex: 1 }, contentStyle]}>{children}</View>
    </View>
  );
}
