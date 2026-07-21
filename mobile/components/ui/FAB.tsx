import { Pressable, type ViewStyle } from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { colors, shadow } from "@/constants/theme";

interface FABProps {
  onPress?: () => void;
  icon?: keyof typeof Feather.glyphMap;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Floating compose action button — blue circle, shadow, non-bouncy press scale. */
export function FAB({ onPress, icon = "edit-3", style }: FABProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      entering={FadeIn.duration(160)}
      style={[{ position: "absolute", right: 20, bottom: 24 }, style]}
    >
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => (scale.value = withTiming(0.94, { duration: 120 }))}
        onPressOut={() => (scale.value = withTiming(1, { duration: 120 }))}
        style={[
          {
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
          },
          shadow.fab,
          animatedStyle,
        ]}
      >
        <Feather name={icon} size={24} color="#fff" />
      </AnimatedPressable>
    </Animated.View>
  );
}
