/**
 * SocialProof — narrow horizontal "methodology" strip between sections.
 *
 * Launch integrity: VedicHour is newly launched, so this band shows VERIFIABLE
 * precision/methodology facts (computed by the engine) rather than adoption or
 * review numbers we cannot substantiate. No fabricated counts, ratings, or press.
 * Replace with real, sourced metrics once we have them.
 */

export default function SocialProof() {
  const STATS = [
    { value: '18 / day', label: 'hourly muhurta windows' },
    { value: 'Lahiri', label: 'sidereal ayanamsa' },
    { value: '9 grahas', label: '12 whole-sign houses' },
    { value: '24h', label: 'money-back guarantee' },
  ];

  return (
    <section
      aria-label="Methodology and precision"
      className="py-12 md:py-14 bg-cosmos border-y border-horizon/30 relative"
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-center">
          {STATS.map((s, i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center py-2 md:py-0 border-r border-horizon/20 last:border-r-0 md:[&:nth-child(2)]:border-r"
            >
              <span className="font-display text-3xl md:text-display-sm text-amber tabular-nums leading-tight">
                {s.value}
              </span>
              <span className="font-mono text-mono-sm text-dust/60 tracking-[0.12em] uppercase mt-2">
                {s.label}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center font-mono text-mono-sm text-dust/40 tracking-[0.12em] uppercase">
          Swiss Ephemeris · classical Vimshottari dasha · scripture-cited
        </p>
      </div>
    </section>
  );
}
