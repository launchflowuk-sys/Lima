import { Pressable, type ViewStyle } from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { colors, shadow } from "@/constants/theme";

interface FABProps {
  onPress?: () => void;
  icon?: keyof typeof Feather.glyphMap;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Floating compose action button — blue circle, shadow, press-scale. */
export function FAB({ onPress, icon = "edit-3", style }: FABProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(16).delay(300)}
      style={[{ position: "absolute", right: 20, bottom: 24 }, style]}
    >
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => (scale.value = withSpring(0.9, { damping: 14, stiffness: 320 }))}
        onPressOut={() => (scale.value = withSpring(1, { damping: 14, stiffness: 320 }))}
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
