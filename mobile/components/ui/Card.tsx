import type { ReactNode } from "react";
import { Pressable, View, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { colors, radius, spacing } from "@/constants/theme";

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  /** Accent colour for an optional left border stripe. */
  accent?: string;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const cardBase: ViewStyle = {
  backgroundColor: colors.surface,
  borderRadius: radius.xl,
  padding: spacing.lg,
  // Soft layered shadow.
  shadowColor: "#1C1917",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.06,
  shadowRadius: 12,
  elevation: 2,
};

/**
 * Rounded, softly-shadowed surface. When `onPress` is provided it becomes a
 * pressable with a subtle Reanimated press-scale animation.
 */
export function Card({ children, onPress, accent, style }: CardProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const accentStyle: ViewStyle = accent
    ? { borderLeftWidth: 4, borderLeftColor: accent }
    : {};

  if (!onPress) {
    return <View style={[cardBase, accentStyle, style]}>{children}</View>;
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => (scale.value = withTiming(0.98, { duration: 90 }))}
      onPressOut={() => (scale.value = withTiming(1, { duration: 140 }))}
      style={[cardBase, accentStyle, animatedStyle, style]}
    >
      {children}
    </AnimatedPressable>
  );
}
