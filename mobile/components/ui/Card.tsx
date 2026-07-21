import type { ReactNode } from "react";
import { Pressable, View, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { colors, radius, shadow } from "@/constants/theme";

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  padded?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Big, rounded, soft-shadow white card. Presses with a subtle non-bouncy timing scale. */
export function Card({ children, onPress, style, padded = true }: CardProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const base: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: radius["2xl"],
    padding: padded ? 18 : 0,
    ...shadow.card,
  };

  if (!onPress) {
    return <View style={[base, style]}>{children}</View>;
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => (scale.value = withTiming(0.985, { duration: 120 }))}
      onPressOut={() => (scale.value = withTiming(1, { duration: 120 }))}
      style={[base, animatedStyle, style]}
    >
      {children}
    </AnimatedPressable>
  );
}
