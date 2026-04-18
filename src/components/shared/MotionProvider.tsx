'use client';

import { MotionConfig } from 'framer-motion';
import { ReactNode } from 'react';

/**
 * Global Framer Motion config.
 *
 * `reducedMotion="user"` respects the `prefers-reduced-motion` media query so
 * that users who opt out of motion in their OS won't see transition or
 * animation effects. This is a WCAG 2.1 requirement (2.3.3 Animation from
 * Interactions) and an accessibility win that costs nothing.
 */
export default function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
