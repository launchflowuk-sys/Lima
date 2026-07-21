import type { ReactNode } from "react";
import { Pressable, View, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { spacing } from "@/constants/theme";
import { useColors } from "@/lib/theme";

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  /** Accent colour for an optional left border stripe. */
  accent?: string;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Sharp, bordered surface — flat (no shadow, no radius). When `onPress` is
 * provided it becomes a pressable with restrained opacity feedback.
 */
export function Card({ children, onPress, accent, style }: CardProps) {
  const c = useColors();
  const opacity = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const cardBase: ViewStyle = {
    backgroundColor: c.surface,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: c.divider,
    padding: spacing.lg,
  };

  const accentStyle: ViewStyle = accent ? { borderLeftWidth: 3, borderLeftColor: accent } : {};

  if (!onPress) {
    return <View style={[cardBase, accentStyle, style]}>{children}</View>;
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => (opacity.value = withTiming(0.7, { duration: 80 }))}
      onPressOut={() => (opacity.value = withTiming(1, { duration: 140 }))}
      style={[cardBase, accentStyle, animatedStyle, style]}
    >
      {children}
    </AnimatedPressable>
  );
}
