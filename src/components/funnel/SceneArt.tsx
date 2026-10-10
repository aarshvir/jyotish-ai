/**
 * S07 picture-test tiles: four original, hand-built scenes (no stock photos, no faces).
 * Flat shapes on a dusk palette so they sit on the night canvas without looking generated.
 */

const SKY: Record<string, [string, string]> = {
  temple: ['#F3C98B', '#6B4A7A'],
  ghat: ['#E9B884', '#3E3463'],
  fort: ['#E7956A', '#2E2147'],
  court: ['#C9A25A', '#3A2440'],
};

export function SceneArt({ scene, className }: { scene: 'temple' | 'ghat' | 'fort' | 'court'; className?: string }) {
  const [top, bottom] = SKY[scene];
  const id = `sky-${scene}`;
  return (
    <svg viewBox="0 0 160 120" className={className} role="img" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={id} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
      </defs>
      <rect width="160" height="120" fill={`url(#${id})`} />
      {scene === 'temple' && (
        <g>
          <circle cx="112" cy="86" r="16" fill="#FBE3B0" opacity="0.9" />
          <path d="M0 98 H160 V120 H0 Z" fill="#2B1D33" />
          {/* shikhara: stacked tapering tiers */}
          <path d="M58 98 V70 H102 V98 Z" fill="#3B2742" />
          <path d="M62 70 L66 48 H94 L98 70 Z" fill="#45304D" />
          <path d="M67 48 L72 30 H88 L93 48 Z" fill="#4F3858" />
          <path d="M73 30 L80 16 L87 30 Z" fill="#5A4063" />
          <circle cx="80" cy="14" r="2.5" fill="#E8C97A" />
          <path d="M80 12 V3 L89 6 L80 9" fill="#C75B3A" stroke="#C75B3A" strokeWidth="0.8" />
          <path d="M74 98 V84 Q80 76 86 84 V98 Z" fill="#1E1426" />
          <path d="M30 98 V84 H44 V98 Z M116 98 V86 H128 V98 Z" fill="#33223B" />
        </g>
      )}
      {scene === 'ghat' && (
        <g>
          <circle cx="40" cy="40" r="11" fill="#FBE3B0" opacity="0.85" />
          <path d="M0 56 H160 V82 H0 Z" fill="#5B4A79" opacity="0.55" />
          <path d="M10 66 H40 M60 62 H96 M112 70 H150 M24 76 H58" stroke="#F3D7A8" strokeWidth="1.2" opacity="0.6" strokeLinecap="round" />
          {/* steps */}
          <path d="M0 82 H160 V120 H0 Z" fill="#3A2B3E" />
          <path d="M0 88 H160 M0 95 H160 M0 102 H160 M0 109 H160" stroke="#5A4660" strokeWidth="1.4" />
          {/* chhatri */}
          <path d="M110 82 V64 M132 82 V64" stroke="#2A1D2E" strokeWidth="3" />
          <path d="M104 64 H138 L132 58 Q121 46 110 58 Z" fill="#2A1D2E" />
          <circle cx="121" cy="46" r="2" fill="#2A1D2E" />
          {/* diya */}
          <path d="M60 86 Q66 92 72 86 Z" fill="#E8C97A" />
          <path d="M66 85 Q64 81 66 77 Q68 81 66 85 Z" fill="#FFB347" />
        </g>
      )}
      {scene === 'fort' && (
        <g>
          <path d="M126 22 A10 10 0 1 0 136 34 A8 8 0 1 1 126 22 Z" fill="#F6E3C0" />
          <path d="M0 92 Q40 80 80 88 T160 84 V120 H0 Z" fill="#2A1E36" />
          {/* wall with crenellations */}
          <path
            d="M14 90 V62 H20 V58 H26 V62 H34 V58 H40 V62 H48 V58 H54 V62 H62 V58 H68 V62 H92 V58 H98 V62 H106 V58 H112 V62 H120 V58 H126 V62 H146 V90 Z"
            fill="#3A2A44"
          />
          {/* bastions */}
          <path d="M8 90 V52 Q20 44 32 52 V90 Z M128 90 V50 Q140 42 152 50 V90 Z" fill="#46334F" />
          <path d="M70 90 V44 H90 V90 Z" fill="#46334F" />
          <path d="M66 44 H94 L88 36 Q80 28 72 36 Z" fill="#523C5C" />
          <path d="M76 90 V76 Q80 70 84 76 V90 Z" fill="#1C1324" />
          <rect x="18" y="64" width="4" height="6" rx="1" fill="#E8C97A" opacity="0.8" />
          <rect x="138" y="62" width="4" height="6" rx="1" fill="#E8C97A" opacity="0.8" />
        </g>
      )}
      {scene === 'court' && (
        <g>
          <path d="M0 0 H160 V120 H0 Z" fill="#2E1D33" opacity="0.55" />
          {/* cusped arches */}
          {[0, 1, 2, 3].map((i) => (
            <g key={i} transform={`translate(${8 + i * 38} 0)`}>
              <path d="M0 120 V44 Q0 30 10 24 Q16 14 22 24 Q32 30 32 44 V120 Z" fill="#4A2F45" />
              <path d="M5 120 V48 Q5 36 13 31 Q16 25 19 31 Q27 36 27 48 V120 Z" fill={i === 1 || i === 2 ? '#7A4A4F' : '#3A2338'} />
            </g>
          ))}
          <path d="M0 96 H160 V120 H0 Z" fill="#241626" />
          {/* canopy + throne */}
          <path d="M58 58 H102 L96 50 H64 Z" fill="#C9A25A" />
          <path d="M66 96 V72 Q80 62 94 72 V96 Z" fill="#B08A45" />
          <path d="M71 96 V80 H89 V96 Z" fill="#6E3B3E" />
          <path d="M60 58 V96 M100 58 V96" stroke="#C9A25A" strokeWidth="2" />
        </g>
      )}
    </svg>
  );
}
