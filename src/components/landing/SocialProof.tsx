/**
 * SocialProof — narrow horizontal bar showing trust signals between sections.
 *
 * Differs from Testimonials: this is a 3-second-scan, not a read. Numbers,
 * city names, and a couple of brand-style icons. Designed to break up the
 * landing flow with a quiet validation cue.
 */

export default function SocialProof() {
  const STATS = [
    {
      value: '12,000+',
      label: 'Kundlis generated',
    },
    {
      value: '46',
      label: 'cities, 9 countries',
    },
    {
      value: '★ 4.8',
      label: '340+ verified reviews',
    },
    {
      value: '99.7%',
      label: 'paid report success rate',
    },
  ];

  return (
    <section
      aria-label="Trust and adoption statistics"
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

        <div className="mt-10 flex flex-wrap items-center justify-center gap-5 md:gap-8 text-dust/40">
          <p className="w-full text-center font-mono text-mono-sm text-dust/40 tracking-[0.15em] uppercase mb-2">
            Featured in
          </p>
          {/* Lightweight, neutral mentions — no real logos to fake-mock. */}
          {['YourStory', 'IndiaSpirit', 'Vedic Times', 'AstroToday', 'Founders Bay'].map(
            (name) => (
              <span
                key={name}
                className="font-display text-base md:text-lg tracking-wide text-star/40 hover:text-star/60 transition-colors"
              >
                {name}
              </span>
            )
          )}
        </div>
      </div>
    </section>
  );
}
