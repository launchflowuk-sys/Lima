import { ActivityIndicator, Pressable, Text, View, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { colors, font, radius, shadow } from "@/constants/theme";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Feather.glyphMap;
  style?: ViewStyle;
  full?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  icon,
  style,
  full = true,
}: ButtonProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const isPrimary = variant === "primary";
  const isDanger = variant === "danger";
  const isSecondary = variant === "secondary";

  const bg = isPrimary
    ? colors.primary
    : isDanger
      ? colors.rose
      : isSecondary
        ? colors.surface
        : "transparent";
  const fg = isPrimary || isDanger ? colors.white : isSecondary ? colors.ink : colors.primary;
  const solid = isPrimary || isDanger;
  const isDisabled = disabled || loading;

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={isDisabled}
      onPressIn={() => (scale.value = withSpring(0.96, { damping: 15, stiffness: 320 }))}
      onPressOut={() => (scale.value = withSpring(1, { damping: 15, stiffness: 320 }))}
      style={[
        {
          height: 56,
          borderRadius: radius.lg,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          paddingHorizontal: 20,
          backgroundColor: bg,
          borderWidth: isSecondary ? 1.5 : 0,
          borderColor: colors.lineStrong,
          opacity: isDisabled ? 0.6 : 1,
          width: full ? "100%" : undefined,
        },
        solid ? shadow.button : null,
        animatedStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {icon ? <Feather name={icon} size={18} color={fg} /> : null}
          <Text style={{ color: fg, fontFamily: font.bold, fontSize: 16, letterSpacing: 0.2 }}>
            {label}
          </Text>
        </View>
      )}
    </AnimatedPressable>
  );
}
