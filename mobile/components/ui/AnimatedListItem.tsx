import type { ReactNode } from "react";
import { MotiView } from "moti";

interface AnimatedListItemProps {
  children: ReactNode;
  /** List index — used to stagger the entrance so items cascade in. */
  index?: number;
}

/** Fade + slide-up entrance, staggered by list index. */
export function AnimatedListItem({ children, index = 0 }: AnimatedListItemProps) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 16 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 350, delay: Math.min(index, 12) * 55 }}
    >
      {children}
    </MotiView>
  );
}
