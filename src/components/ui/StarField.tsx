// Deterministic star positions — safe for SSR, no hydration mismatch.
// Uses a simple LCG (linear congruential generator) seeded by index.
//
// Perf: static per-star styling lives in the `.vh-star` CSS class (globals.css),
// so each <span> carries only 5 CSS custom properties, and the generated values
// are rounded to 1 decimal — together this roughly halves the StarField markup
// that ships on every page. `will-change` is intentionally dropped, removing 80
// forced GPU layer promotions (the browser composites the twinkle on demand).
// The rendered visual is unchanged.

import type { CSSProperties } from 'react';

interface Star {
  id: number;
  x: number; // 0–100 %
  y: number; // 0–100 %
  size: number; // 0.5–2.5 px
  delay: number; // 0–8 s
  duration: number; // 3–7 s
}

function lcg(seed: number): number {
  return ((seed * 1664525 + 1013904223) & 0x7fffffff) / 0x7fffffff;
}

/** Round to 1 decimal — trims long-float bloat from the inline vars; sub-pixel
 *  precision is invisible at 0.1 opacity. */
const r1 = (n: number) => Math.round(n * 10) / 10;

function generateStars(count: number): Star[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: r1(lcg(i * 4 + 1) * 100),
    y: r1(lcg(i * 4 + 2) * 100),
    size: r1(lcg(i * 4 + 3) * 2 + 0.5),
    delay: r1(lcg(i * 4 + 4) * 8),
    duration: r1(lcg(i * 4 + 5) * 4 + 3),
  }));
}

const STARS = generateStars(80);

export function StarField() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {STARS.map((s) => (
        <span
          key={s.id}
          className="vh-star"
          style={
            {
              '--x': `${s.x}%`,
              '--y': `${s.y}%`,
              '--sz': `${s.size}px`,
              '--dur': `${s.duration}s`,
              '--dly': `${s.delay}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
