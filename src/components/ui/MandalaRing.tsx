interface MandalaRingProps {
  className?: string;
}

// Pre-computed petal and spoke positions (deterministic, SSR-safe)
const SPOKES_12 = Array.from({ length: 12 }, (_, i) => {
  const a = ((i * 30 - 90) * Math.PI) / 180;
  return { x2: 200 + 188 * Math.cos(a), y2: 200 + 188 * Math.sin(a) };
});

const PETALS_16 = Array.from({ length: 16 }, (_, i) => {
  const a = ((i * 22.5 - 90) * Math.PI) / 180;
  return { cx: 200 + 148 * Math.cos(a), cy: 200 + 148 * Math.sin(a) };
});

const PETALS_8 = Array.from({ length: 8 }, (_, i) => {
  const a = ((i * 45 - 90) * Math.PI) / 180;
  return { cx: 200 + 105 * Math.cos(a), cy: 200 + 105 * Math.sin(a) };
});

export function MandalaRing({ className }: MandalaRingProps) {
  return (
    <svg
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
      suppressHydrationWarning
    >
      {/* ── Triple outer border (bhupura) ───────────────────────────────── */}
      <circle cx="200" cy="200" r="194" stroke="currentColor" strokeWidth="1"   opacity="0.9" />
      <circle cx="200" cy="200" r="189" stroke="currentColor" strokeWidth="0.4" opacity="0.6" />
      <circle cx="200" cy="200" r="184" stroke="currentColor" strokeWidth="1"   opacity="0.9" />

      {/* ── 12 spokes ───────────────────────────────────────────────────── */}
      {SPOKES_12.map((s, i) => (
        <line
          key={i}
          x1="200" y1="200"
          x2={s.x2} y2={s.y2}
          stroke="currentColor"
          strokeWidth="0.3"
          opacity="0.35"
        />
      ))}

      {/* ── 16-petal ring ───────────────────────────────────────────────── */}
      <circle cx="200" cy="200" r="170" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
      {PETALS_16.map((p, i) => (
        <circle
          key={i}
          cx={p.cx} cy={p.cy}
          r="19"
          stroke="currentColor"
          strokeWidth="0.5"
          opacity="0.55"
        />
      ))}

      {/* ── 8-petal ring ────────────────────────────────────────────────── */}
      <circle cx="200" cy="200" r="128" stroke="currentColor" strokeWidth="0.5" opacity="0.6" />
      {PETALS_8.map((p, i) => (
        <circle
          key={i}
          cx={p.cx} cy={p.cy}
          r="23"
          stroke="currentColor"
          strokeWidth="0.6"
          opacity="0.65"
        />
      ))}

      {/* ── Interlocking triangles (Shatkon / Star of David) ────────────── */}
      {/* Upward triangle — apex at 12 o'clock */}
      <polygon
        points="200,112 284,258 116,258"
        stroke="currentColor" strokeWidth="0.7"
        fill="none" opacity="0.75"
      />
      {/* Downward triangle — apex at 6 o'clock */}
      <polygon
        points="200,288 116,142 284,142"
        stroke="currentColor" strokeWidth="0.7"
        fill="none" opacity="0.75"
      />

      {/* ── Inner concentric circles ─────────────────────────────────────── */}
      <circle cx="200" cy="200" r="80"  stroke="currentColor" strokeWidth="0.5" opacity="0.6" />
      <circle cx="200" cy="200" r="52"  stroke="currentColor" strokeWidth="0.5" opacity="0.7" />
      <circle cx="200" cy="200" r="28"  stroke="currentColor" strokeWidth="0.6" opacity="0.8" />

      {/* ── Central bindu ───────────────────────────────────────────────── */}
      <circle cx="200" cy="200" r="14"  stroke="currentColor" strokeWidth="0.8" fill="none"           opacity="0.9" />
      <circle cx="200" cy="200" r="5"   fill="currentColor"                      opacity="0.9" />
    </svg>
  );
}
