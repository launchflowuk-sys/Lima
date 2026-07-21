import { MotiView } from "moti";
import type { DimensionValue } from "react-native";
import { useColors } from "@/lib/theme";

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  /** Sharp blocks by default; pass a radius only for round dots. */
  rounded?: number;
}

/** Flat sharp loading block with a restrained opacity pulse. */
export function Skeleton({ width = "100%", height = 16, rounded = 0 }: SkeletonProps) {
  const c = useColors();
  return (
    <MotiView
      from={{ opacity: 0.5 }}
      animate={{ opacity: 0.85 }}
      transition={{ type: "timing", duration: 800, loop: true, repeatReverse: true }}
      style={{ width, height, borderRadius: rounded, backgroundColor: c.surfaceAlt }}
    />
  );
}
