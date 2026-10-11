import { SIGNS, type Sign } from '@/lib/funnel/reveal/astro';

/**
 * North-Indian chart diamond with the visitor's real Rahu–Ketu axis drawn across it.
 * House positions are fixed (1st at the top centre); each house shows its sign number,
 * counted from the rising sign — or from the Moon when the birth time is unknown.
 */

const CENTRE: Record<number, [number, number]> = {
  1: [150, 82], 2: [75, 38], 3: [38, 75], 4: [82, 150], 5: [38, 225], 6: [75, 262],
  7: [150, 218], 8: [225, 262], 9: [262, 225], 10: [218, 150], 11: [262, 75], 12: [225, 38],
};

export function NodeChart({
  referenceSign,
  reference,
  rahuHouse,
  ketuHouse,
}: {
  referenceSign: Sign;
  reference: 'lagna' | 'moon';
  rahuHouse: number;
  ketuHouse: number;
}) {
  const refIdx = SIGNS.indexOf(referenceSign);
  const [rx, ry] = CENTRE[rahuHouse];
  const [kx, ky] = CENTRE[ketuHouse];
  return (
    <svg viewBox="0 0 300 300" className="w-full h-auto" role="img" aria-label={`Birth chart: Rahu in house ${rahuHouse}, Ketu in house ${ketuHouse}`}>
      <rect x="1" y="1" width="298" height="298" rx="6" fill="none" stroke="#E8C97A" strokeOpacity="0.55" strokeWidth="1.5" />
      <path d="M1 1 L299 299 M299 1 L1 299" stroke="#E8C97A" strokeOpacity="0.35" strokeWidth="1" />
      <path d="M150 1 L299 150 L150 299 L1 150 Z" fill="none" stroke="#E8C97A" strokeOpacity="0.35" strokeWidth="1" />
      <line x1={rx} y1={ry} x2={kx} y2={ky} stroke="#E8C97A" strokeWidth="1.5" strokeDasharray="4 4" />
      {Object.entries(CENTRE).map(([h, [x, y]]) => {
        const house = Number(h);
        const signNo = ((refIdx + house - 1) % 12) + 1;
        return (
          <text key={h} x={x} y={y + (house === 1 ? 36 : 28)} textAnchor="middle" fontSize="11" fill="#9B8FA6" fontFamily="var(--font-body)">
            {signNo}
          </text>
        );
      })}
      <text x={CENTRE[1][0]} y={CENTRE[1][1] - 26} textAnchor="middle" fontSize="11" fill="#C9BCCE" fontFamily="var(--font-body)">
        {reference === 'lagna' ? 'Asc' : 'Moon'}
      </text>
      <g fontFamily="var(--font-body)" fontWeight="600" fontSize="15" textAnchor="middle">
        <circle cx={rx} cy={ry} r="16" fill="#251A38" stroke="#E8C97A" strokeWidth="1.2" />
        <text x={rx} y={ry + 5} fill="#F6EFE4">Ra</text>
        <circle cx={kx} cy={ky} r="16" fill="#251A38" stroke="#E8C97A" strokeWidth="1.2" />
        <text x={kx} y={ky + 5} fill="#F6EFE4">Ke</text>
      </g>
    </svg>
  );
}
