import { ActivityIndicator, Pressable, Text, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { colors, gradients, radius, spacing } from "@/constants/theme";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Primary gradient / secondary / ghost button with a Reanimated press-scale
 * animation and a built-in loading spinner state.
 */
export function Button({ label, onPress, variant = "primary", loading = false, disabled = false, style }: ButtonProps) {
  const scale = useSharedValue(1);
  const isDisabled = disabled || loading;

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const base: ViewStyle = {
    borderRadius: radius.lg,
    paddingVertical: 15,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  };

  const textColor = variant === "primary" ? colors.white : variant === "secondary" ? colors.ink : colors.primary;

  const content = loading ? (
    <ActivityIndicator color={textColor} />
  ) : (
    <Text style={{ color: textColor, fontWeight: "700", fontSize: 16 }}>{label}</Text>
  );

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={isDisabled}
      onPressIn={() => (scale.value = withTiming(0.96, { duration: 90 }))}
      onPressOut={() => (scale.value = withTiming(1, { duration: 140 }))}
      style={[animatedStyle, { opacity: isDisabled ? 0.6 : 1 }, style]}
    >
      {variant === "primary" ? (
        <LinearGradient
          colors={gradients.primaryButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={base}
        >
          {content}
        </LinearGradient>
      ) : (
        <View
          style={[
            base,
            variant === "secondary"
              ? { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline }
              : { backgroundColor: "transparent" },
          ]}
        >
          {content}
        </View>
      )}
    </AnimatedPressable>
  );
}
