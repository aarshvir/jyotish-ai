import Link from 'next/link';

const PLANS = [
  {
    name: 'Preview',
    price: 'Free',
    priceNote: 'No card required',
    description: '1 chart overview',
    features: [
      'Birth chart calculation',
      'Lagna + Moon sign',
      'Current dasha period',
      'Sample hora schedule',
    ],
    cta: 'Start Free',
    href: '/onboard?plan=free',
    featured: false,
    isPaid: false,
  },
  {
    name: '7-Day Forecast',
    price: '$4.99',
    priceNote: 'one-time',
    description: 'Full week of hourly precision',
    features: [
      'Hourly ratings (1–100)',
      'Hora + choghadiya overlay',
      'Rahu Kaal windows',
      'AI narrative per day',
      'Best & avoid windows',
    ],
    cta: 'Get 7 Days',
    href: '/onboard?plan=7day',
    featured: true,
    isPaid: true,
  },
  {
    name: 'Monthly Oracle',
    price: '$19.99',
    priceNote: 'per month',
    description: '30 days of guidance',
    features: [
      'Everything in 7-Day',
      '30-day hourly calendar',
      'Nativity profile analysis',
      'Dasha interpretation',
      'PDF export',
    ],
    cta: 'Get Monthly',
    href: '/onboard?plan=monthly',
    featured: false,
    isPaid: true,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-28 bg-cosmos relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-horizon to-transparent" />

      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="font-mono text-xs text-amber tracking-[0.2em] uppercase mb-4">Pricing</p>
          <h2
            className="font-display font-semibold text-star mb-4"
            style={{ fontSize: 'clamp(32px, 4vw, 56px)' }}
          >
            Choose Your Oracle
          </h2>
          <p className="font-body text-dust text-lg max-w-xl mx-auto">
            Start free. Upgrade when the charts align.
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-sm transition-all duration-300 ${
                plan.featured
                  ? 'bg-nebula border-2 border-amber scale-[1.03] shadow-[0_0_40px_rgba(245,158,11,0.12)]'
                  : 'bg-space border border-horizon hover:border-amber/30'
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-px left-0 right-0 h-[2px] bg-amber rounded-t-sm" />
              )}
              {plan.featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber text-space text-[10px] font-mono font-medium tracking-[0.15em] uppercase whitespace-nowrap">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="p-8 flex flex-col h-full">
                {/* Plan name */}
                <div className="mb-6">
                  <p className="font-mono text-xs text-dust tracking-[0.15em] uppercase mb-2">
                    {plan.name}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display font-semibold text-4xl text-star">
                      {plan.price}
                    </span>
                    <span className="font-mono text-xs text-dust">{plan.priceNote}</span>
                  </div>
                  <p className="font-body text-sm text-dust mt-1">{plan.description}</p>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-amber mt-0.5 shrink-0">
                        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1" opacity="0.5" />
                        <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="font-body text-sm text-dust leading-snug">{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className="space-y-3">
                  <Link
                    href={plan.href}
                    className={`w-full block text-center py-3 rounded-sm font-body text-sm font-medium tracking-wide transition-colors duration-200 ${
                      plan.featured
                        ? 'bg-amber text-space hover:bg-amber-glow'
                        : 'border border-horizon text-dust hover:border-amber/40 hover:text-star'
                    }`}
                  >
                    {plan.cta}
                  </Link>

                  {/* Money-back guarantee for paid plans */}
                  {plan.isPaid && (
                    <div className="flex items-center justify-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-emerald shrink-0">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </svg>
                      <span className="font-mono text-xs text-emerald/70">
                        48-hour money-back guarantee
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
