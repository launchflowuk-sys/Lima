import type { ReactNode } from "react";
import { MotiView } from "moti";

interface AnimatedListItemProps {
  children: ReactNode;
  /** List index — used to stagger the entrance so items cascade in. */
  index?: number;
}

/** Restrained fade + small slide-up entrance, staggered by list index. */
export function AnimatedListItem({ children, index = 0 }: AnimatedListItemProps) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 260, delay: Math.min(index, 10) * 40 }}
    >
      {children}
    </MotiView>
  );
}
