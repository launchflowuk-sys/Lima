import { useEffect } from "react";
import { View, type DimensionValue, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { colors, radius } from "@/constants/theme";

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

const SHEEN_WIDTH = 120;

/** A single shimmering placeholder block. */
export function Skeleton({ width = "100%", height = 16, radius: r = 8, style }: SkeletonProps) {
  const x = useSharedValue(-SHEEN_WIDTH);

  useEffect(() => {
    x.value = withRepeat(
      withTiming(320, { duration: 1200, easing: Easing.linear }),
      -1,
      false,
    );
  }, [x]);

  const sheen = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      style={[
        { width, height, borderRadius: r, backgroundColor: "#E9EEF5", overflow: "hidden" },
        style,
      ]}
    >
      <Animated.View style={[{ width: SHEEN_WIDTH, height: "100%" }, sheen]}>
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.85)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
}

/** A skeleton shaped like an inbox / list card. */
export function SkeletonCard() {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius["2xl"],
        padding: 18,
        marginBottom: 14,
        flexDirection: "row",
        gap: 14,
      }}
    >
      <Skeleton width={48} height={48} radius={24} />
      <View style={{ flex: 1, gap: 9, paddingTop: 3 }}>
        <Skeleton width="55%" height={14} />
        <Skeleton width="85%" height={12} />
        <Skeleton width="70%" height={12} />
      </View>
    </View>
  );
}

export function SkeletonList({ count = 6 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}
