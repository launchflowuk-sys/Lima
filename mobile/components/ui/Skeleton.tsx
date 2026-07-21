import { MotiView } from "moti";
import type { DimensionValue } from "react-native";
import { colors, radius } from "@/constants/theme";

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  rounded?: number;
}

/** Moti shimmer placeholder — a pulsing opacity block for loading states. */
export function Skeleton({ width = "100%", height = 16, rounded = radius.sm }: SkeletonProps) {
  return (
    <MotiView
      from={{ opacity: 0.4 }}
      animate={{ opacity: 1 }}
      transition={{ type: "timing", duration: 900, loop: true, repeatReverse: true }}
      style={{ width, height, borderRadius: rounded, backgroundColor: colors.surfaceAlt }}
    />
  );
}
