import Link from 'next/link';

/**
 * Always-on product cross-sell. Every completed reading should offer the other
 * two pillars so a buyer of one product is one tap from the next.
 */
export function ProductCrossSell({
  exclude,
  className = '',
}: {
  exclude?: 'forecast' | 'kundali' | 'synastry';
  className?: string;
}) {
  const cards = [
    {
      id: 'forecast' as const,
      eyebrow: 'Timing',
      title: 'Hour-by-hour forecast',
      body: '18 Vedic windows a day, scored for your chart — know when to act and when to wait.',
      href: '/onboard?plan=7day',
      cta: 'See my hours →',
    },
    {
      id: 'kundali' as const,
      eyebrow: 'Birth chart',
      title: 'Deep Kundli report',
      body: 'Seven life areas, dashas and yogas in plain English — the sitting an astrologer would give you.',
      href: '/kundali',
      cta: 'Open Kundli →',
    },
    {
      id: 'synastry' as const,
      eyebrow: 'Matchmaking',
      title: 'Gun Milan (36 points)',
      body: 'Classical Ashtakoot matching for two charts — the question families actually ask.',
      href: '/synastry',
      cta: 'Check compatibility →',
    },
  ].filter((c) => c.id !== exclude);

  return (
    <section
      aria-labelledby="product-cross-sell-heading"
      className={`pdf-exclude rounded-card border border-amber/25 bg-nebula/30 p-6 sm:p-8 ${className}`}
      data-print-hide
    >
      <p className="font-mono text-mono-sm text-amber/80 uppercase tracking-[0.14em]">Go further</p>
      <h2 id="product-cross-sell-heading" className="font-display text-headline-lg text-star mt-2">
        Three readings. One chart engine.
      </h2>
      <p className="font-body text-body-sm text-dust mt-2 max-w-2xl">
        Timing, nativity and compatibility share the same Swiss Ephemeris math — pick the next
        question you actually need answered.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.id}
            href={c.href}
            className="group rounded-card border border-horizon/50 hover:border-amber/50 bg-cosmos p-5 transition-colors"
          >
            <p className="font-mono text-mono-sm text-amber uppercase tracking-wider">{c.eyebrow}</p>
            <h3 className="font-display text-xl text-star mt-1 group-hover:text-amber transition-colors">
              {c.title}
            </h3>
            <p className="font-body text-body-sm text-dust mt-2 leading-relaxed">{c.body}</p>
            <span className="inline-block mt-4 font-body text-sm text-amber">{c.cta}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
