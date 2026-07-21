import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { fonts, spacing } from "@/constants/theme";
import { useColors } from "@/lib/theme";

type Variant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  /** Full-width, flush-left label (the mockup's "Approve & send" block). */
  block?: boolean;
  /** Optional trailing element (e.g. an arrow icon), pushed to the far right. */
  rightIcon?: ReactNode;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Modernist flat button — sharp corners, solid blue (primary) / bordered
 * (secondary) / solid red (danger) / text (ghost). Crisp, restrained press
 * feedback (subtle scale + opacity). No gradients, no shadows.
 */
export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  block = false,
  rightIcon,
  style,
}: ButtonProps) {
  const c = useColors();
  const scale = useSharedValue(1);
  const isDisabled = disabled || loading;
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const base: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: block ? "flex-start" : "center",
    gap: spacing.sm,
    borderRadius: 0,
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    width: block ? "100%" : undefined,
  };

  const skin: ViewStyle =
    variant === "primary"
      ? { backgroundColor: c.primary, borderColor: c.primary }
      : variant === "danger"
        ? { backgroundColor: c.danger, borderColor: c.danger }
        : variant === "secondary"
          ? { backgroundColor: "transparent", borderColor: c.dividerStrong }
          : { backgroundColor: "transparent", borderColor: "transparent" };

  const textColor =
    variant === "primary" || variant === "danger"
      ? c.primaryFg
      : variant === "ghost"
        ? c.primary
        : c.text;

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={isDisabled}
      onPressIn={() => (scale.value = withTiming(0.98, { duration: 80 }))}
      onPressOut={() => (scale.value = withTiming(1, { duration: 120 }))}
      style={[base, skin, animatedStyle, { opacity: isDisabled ? 0.45 : 1 }, style]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          <Text style={{ color: textColor, fontFamily: fonts.heading, fontSize: 15 }}>{label}</Text>
          {rightIcon ? <View style={{ marginLeft: "auto" }}>{rightIcon}</View> : null}
        </>
      )}
    </AnimatedPressable>
  );
}
