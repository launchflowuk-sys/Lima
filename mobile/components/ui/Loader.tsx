import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import { useColors } from "@/lib/theme";

interface LoaderProps {
  size?: number;
  color?: string;
}

/** Continuously-spinning square-cornered ring — flat, no asset. */
export function Loader({ size = 28, color }: LoaderProps) {
  const c = useColors();
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(withTiming(360, { duration: 800, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(rotation);
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: Math.max(2, size / 10),
          borderColor: c.divider,
          borderTopColor: color ?? c.primary,
        },
        animatedStyle,
      ]}
    >
      <View />
    </Animated.View>
  );
}
