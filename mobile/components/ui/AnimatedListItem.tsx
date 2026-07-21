import type { ReactNode } from "react";
import Animated, { FadeIn } from "react-native-reanimated";

interface AnimatedListItemProps {
  index: number;
  children: ReactNode;
}

/** Subtle, non-bouncy fade-in for list rows (gentle stagger, no spring overshoot). */
export function AnimatedListItem({ index, children }: AnimatedListItemProps) {
  return (
    <Animated.View entering={FadeIn.duration(180).delay(Math.min(index, 8) * 18)}>
      {children}
    </Animated.View>
  );
}
