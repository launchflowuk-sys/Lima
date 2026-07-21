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
import { colors } from "@/constants/theme";

interface LoaderProps {
  size?: number;
  color?: string;
}

/** Smooth continuously-spinning Reanimated ring — no external asset needed. */
export function Loader({ size = 28, color = colors.primary }: LoaderProps) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(withTiming(360, { duration: 900, easing: Easing.linear }), -1, false);
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
          borderColor: colors.hairline,
          borderTopColor: color,
        },
        animatedStyle,
      ]}
    >
      <View />
    </Animated.View>
  );
}
