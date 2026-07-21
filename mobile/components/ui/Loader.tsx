import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { colors } from "@/constants/theme";

interface LoaderProps {
  size?: number;
  color?: string;
}

/** Branded spinning ring loader (Reanimated, no ActivityIndicator). */
export function Loader({ size = 34, color = colors.primary }: LoaderProps) {
  const rot = useSharedValue(0);

  useEffect(() => {
    rot.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.linear }), -1, false);
  }, [rot]);

  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value * 360}deg` }] }));

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: size * 0.11,
          borderColor: colors.primarySoft,
          borderTopColor: color,
        },
        spin,
      ]}
    >
      <View />
    </Animated.View>
  );
}
