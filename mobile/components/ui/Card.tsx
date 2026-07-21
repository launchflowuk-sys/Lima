import type { ReactNode } from "react";
import { Pressable, View, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { colors, radius, shadow } from "@/constants/theme";

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  padded?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Big, rounded, soft-shadow white card. Presses with a subtle spring scale. */
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
      onPressIn={() => (scale.value = withSpring(0.98, { damping: 18, stiffness: 300 }))}
      onPressOut={() => (scale.value = withSpring(1, { damping: 18, stiffness: 300 }))}
      style={[base, animatedStyle, style]}
    >
      {children}
    </AnimatedPressable>
  );
}
