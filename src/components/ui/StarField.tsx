// Deterministic star positions — safe for SSR, no hydration mismatch.
// Uses a simple LCG (linear congruential generator) seeded by index.

interface Star {
  id: number;
  x: number;       // 0–100 %
  y: number;       // 0–100 %
  size: number;    // 0.5–2.5 px
  delay: number;   // 0–8 s
  duration: number; // 3–7 s
}

function lcg(seed: number): number {
  return ((seed * 1664525 + 1013904223) & 0x7fffffff) / 0x7fffffff;
}

function generateStars(count: number): Star[] {
  return Array.from({ length: count }, (_, i) => {
    const r1 = lcg(i * 4 + 1);
    const r2 = lcg(i * 4 + 2);
    const r3 = lcg(i * 4 + 3);
    const r4 = lcg(i * 4 + 4);
    const r5 = lcg(i * 4 + 5);
    return {
      id:       i,
      x:        r1 * 100,
      y:        r2 * 100,
      size:     r3 * 2 + 0.5,
      delay:    r4 * 8,
      duration: r5 * 4 + 3,
    };
  });
}

const STARS = generateStars(150);

export function StarField() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {STARS.map((s) => (
        <span
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{
            left:      `${s.x}%`,
            top:       `${s.y}%`,
            width:     `${s.size}px`,
            height:    `${s.size}px`,
            opacity:   0.1,
            animation: `twinkle ${s.duration}s ${s.delay}s ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  );
}
