import { Pressable, Text, View, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { font, radius, shadow } from "@/constants/theme";

export type Tone = "blue" | "green" | "amber" | "red" | "violet" | "sky" | "ink";

interface ToneStyle {
  bg: string;
  fg: string; // primary text (value)
  sub: string; // secondary text (label/hint)
  chip: string; // translucent icon chip bg
}

/** Saturated tile backgrounds with high-contrast text on top. */
const TONES: Record<Tone, ToneStyle> = {
  blue: { bg: "#2563EB", fg: "#FFFFFF", sub: "rgba(255,255,255,0.82)", chip: "rgba(255,255,255,0.18)" },
  green: { bg: "#059669", fg: "#FFFFFF", sub: "rgba(255,255,255,0.85)", chip: "rgba(255,255,255,0.18)" },
  amber: { bg: "#F59E0B", fg: "#3B2406", sub: "rgba(59,36,6,0.72)", chip: "rgba(59,36,6,0.12)" },
  red: { bg: "#E11D48", fg: "#FFFFFF", sub: "rgba(255,255,255,0.85)", chip: "rgba(255,255,255,0.18)" },
  violet: { bg: "#7C3AED", fg: "#FFFFFF", sub: "rgba(255,255,255,0.85)", chip: "rgba(255,255,255,0.18)" },
  sky: { bg: "#0EA5E9", fg: "#FFFFFF", sub: "rgba(255,255,255,0.85)", chip: "rgba(255,255,255,0.18)" },
  ink: { bg: "#0F172A", fg: "#FFFFFF", sub: "rgba(255,255,255,0.7)", chip: "rgba(255,255,255,0.12)" },
};

interface StatTileProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: keyof typeof Feather.glyphMap;
  tone?: Tone;
  /** Hero tiles get a larger value + row layout. */
  hero?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** A vibrant bento stat card. Height/width come from the parent via `style`. */
export function StatTile({ label, value, hint, icon, tone = "blue", hero = false, onPress, style }: StatTileProps) {
  const t = TONES[tone];
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const base: ViewStyle = {
    backgroundColor: t.bg,
    borderRadius: radius["2xl"],
    padding: hero ? 22 : 16,
    justifyContent: "space-between",
    overflow: "hidden",
    ...shadow.card,
  };

  const content = hero ? (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontFamily: font.semibold, fontSize: 13.5, color: t.sub, letterSpacing: 0.2 }}>{label}</Text>
        {icon ? (
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.chip, alignItems: "center", justifyContent: "center" }}>
            <Feather name={icon} size={20} color={t.fg} />
          </View>
        ) : null}
      </View>
      <View style={{ marginTop: 14 }}>
        <Text style={{ fontFamily: font.extrabold, fontSize: 46, color: t.fg, letterSpacing: -1.5, lineHeight: 50 }}>
          {value}
        </Text>
        {hint ? (
          <Text style={{ fontFamily: font.medium, fontSize: 13.5, color: t.sub, marginTop: 4 }}>{hint}</Text>
        ) : null}
      </View>
    </>
  ) : (
    <>
      {icon ? (
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.chip, alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
          <Feather name={icon} size={18} color={t.fg} />
        </View>
      ) : null}
      <View>
        <Text style={{ fontFamily: font.extrabold, fontSize: 30, color: t.fg, letterSpacing: -0.8, lineHeight: 34 }}>
          {value}
        </Text>
        <Text style={{ fontFamily: font.semibold, fontSize: 12.5, color: t.sub, marginTop: 3 }} numberOfLines={2}>
          {label}
        </Text>
        {hint ? (
          <Text style={{ fontFamily: font.medium, fontSize: 11.5, color: t.sub, marginTop: 2 }} numberOfLines={1}>
            {hint}
          </Text>
        ) : null}
      </View>
    </>
  );

  if (!onPress) return <View style={[base, style]}>{content}</View>;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => (scale.value = withTiming(0.98, { duration: 120 }))}
      onPressOut={() => (scale.value = withTiming(1, { duration: 120 }))}
      style={[base, animatedStyle, style]}
    >
      {content}
    </AnimatedPressable>
  );
}
