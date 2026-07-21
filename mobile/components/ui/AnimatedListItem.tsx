import type { ReactNode } from "react";
import Animated, { FadeInDown } from "react-native-reanimated";

interface AnimatedListItemProps {
  index: number;
  children: ReactNode;
}

/** Staggered spring entrance for list rows. */
export function AnimatedListItem({ index, children }: AnimatedListItemProps) {
  return (
    <Animated.View
      entering={FadeInDown.springify()
        .damping(18)
        .stiffness(180)
        .delay(Math.min(index, 10) * 55)}
    >
      {children}
    </Animated.View>
  );
}
