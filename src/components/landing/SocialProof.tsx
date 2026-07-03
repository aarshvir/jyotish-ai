/**
 * SocialProof — narrow horizontal bar of verifiable engine facts between sections.
 *
 * Every value is a product fact (engine capability), never a popularity claim —
 * no invented counters, reviews or ratings. Currently not rendered on the
 * landing page (the hero trust bar carries these facts); kept for reuse on
 * other surfaces. This is a 3-second-scan, not a read.
 */

export default function SocialProof() {
  const STATS = [
    {
      value: '18',
      label: 'rated windows per day',
    },
    {
      value: '12',
      label: 'lagnas covered',
    },
    {
      value: 'Sidereal',
      label: 'Swiss Ephemeris · Lahiri Ayanamsa',
    },
  ];

  return (
    <section
      aria-label="Engine facts"
      className="py-12 md:py-14 bg-cosmos border-y border-horizon/30 relative"
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-3 gap-6 md:gap-8 text-center">
          {STATS.map((s, i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center py-2 md:py-0 border-r border-horizon/20 last:border-r-0 md:[&:nth-child(2)]:border-r"
            >
              <span className="font-display text-3xl md:text-display-sm text-amber tabular-nums leading-tight">
                {s.value}
              </span>
              <span className="font-mono text-mono-sm text-dust tracking-[0.12em] uppercase mt-2">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
