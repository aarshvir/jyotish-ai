/**
 * VedicVsWestern — differentiator section showing how Vedic / Jyotish differs
 * from Western astrology. Built as a comparison table with classical Sanskrit
 * terms (preserved, never auto-translated).
 */

const ROWS = [
  {
    dim: 'Zodiac system',
    vedic: 'Sidereal — Lahiri ayanamsa, anchored to fixed stars',
    western: 'Tropical — tied to equinoxes, drifts with precession',
    matters: 'Your sidereal lagna is typically one full sign behind your tropical sun sign.',
  },
  {
    dim: 'Lagna (Ascendant)',
    vedic: 'Foundation of the chart, drives houses and Vimshottari dasha',
    western: 'Rising sign, secondary to sun sign in popular use',
    matters: 'Jyotish gives you a chart unique to your exact birth minute, not just your month.',
  },
  {
    dim: 'Timing system',
    vedic: 'Vimshottari dasha — 120-yr predictive cycle of planetary periods',
    western: 'Transits, secondary progressions',
    matters: 'Dasha tells you which life chapter you are in, not just what is happening today.',
  },
  {
    dim: 'Daily timing',
    vedic: 'Hora (planetary hour) + Choghadiya (8 muhurtas) + Rahu Kaal',
    western: 'Hourly transits, lunar phase mood',
    matters: 'Vedic gives you 18+ named hour-windows per day — actionable, not just descriptive.',
  },
  {
    dim: 'Source canon',
    vedic: 'Brihat Parashara Hora Shastra, Phaladeepika, Jaimini Sutras',
    western: 'Modern interpretations, Linda Goodman, Liz Greene',
    matters: 'Jyotish has 2,000 years of continuous scholarly tradition behind every reading.',
  },
  {
    dim: 'Houses',
    vedic: 'Whole-sign houses — clean, unambiguous',
    western: 'Placidus, Koch, Equal — multiple competing systems',
    matters: 'No house-system ambiguity. Every degree falls in exactly one bhava.',
  },
];

function CheckCircle({ tone }: { tone: 'amber' | 'dust' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0 mt-1">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1" opacity={tone === 'amber' ? '0.6' : '0.3'} className={tone === 'amber' ? 'text-amber' : 'text-dust'} />
      <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={tone === 'amber' ? 'text-amber' : 'text-dust/60'} />
    </svg>
  );
}

export default function VedicVsWestern() {
  return (
    <section
      aria-labelledby="vedic-western-heading"
      className="py-24 md:py-28 bg-cosmos relative"
    >
      <div className="section-divider absolute top-0 left-0 right-0" />

      <div className="max-w-6xl mx-auto px-6">
        <div className="section-header text-center">
          <p className="section-eyebrow">The Difference</p>
          <h2 id="vedic-western-heading" className="section-title text-display-md">
            Vedic Jyotish vs Western Astrology
          </h2>
          <p className="section-subtitle text-body-lg mx-auto">
            We do Jyotish — sidereal, scripture-grounded, hour-precise. Here is what that means.
          </p>
        </div>

        {/* Desktop / tablet: table layout */}
        <div className="hidden md:block overflow-hidden rounded-card border border-horizon/30 bg-space">
          <table className="w-full text-left">
            <thead className="bg-bg-3">
              <tr>
                <th className="p-4 font-mono text-mono-sm text-dust/60 uppercase tracking-wider w-1/5">Dimension</th>
                <th className="p-4 font-body text-headline-sm text-amber w-2/5 border-l border-horizon/30">
                  Vedic Jyotish (us)
                </th>
                <th className="p-4 font-body text-headline-sm text-dust/60 w-2/5 border-l border-horizon/30">
                  Western Astrology
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.dim} className="border-t border-horizon/20 align-top">
                  <td className="p-4 font-body text-body-md text-star/90 font-semibold">{r.dim}</td>
                  <td className="p-4 border-l border-horizon/30">
                    <div className="flex gap-2">
                      <CheckCircle tone="amber" />
                      <div>
                        <p className="font-body text-body-sm text-star/90">{r.vedic}</p>
                        <p className="font-mono text-mono-sm text-amber/60 italic mt-1.5">
                          {r.matters}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 border-l border-horizon/30">
                    <div className="flex gap-2">
                      <CheckCircle tone="dust" />
                      <p className="font-body text-body-sm text-dust/70">{r.western}</p>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: stacked cards */}
        <div className="md:hidden space-y-4">
          {ROWS.map((r) => (
            <div key={r.dim} className="card p-5">
              <p className="font-mono text-mono-sm text-amber/70 tracking-[0.12em] uppercase mb-3">
                {r.dim}
              </p>
              <div className="space-y-3">
                <div>
                  <p className="font-body text-body-sm text-amber font-semibold mb-1">Vedic Jyotish</p>
                  <p className="font-body text-body-sm text-star/85">{r.vedic}</p>
                </div>
                <div>
                  <p className="font-body text-body-sm text-dust/60 font-semibold mb-1">Western</p>
                  <p className="font-body text-body-sm text-dust/70">{r.western}</p>
                </div>
                <p className="font-mono text-mono-sm text-amber/60 italic pt-2 border-t border-horizon/20">
                  Why it matters: {r.matters}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
