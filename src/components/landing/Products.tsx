/**
 * Products — the three distinct VedicHour products, presented as equal offerings.
 *
 * The homepage is otherwise built as a single hour-by-hour-forecast funnel, which
 * makes the standalone Kundali and Matchmaking products invisible. This section sits
 * directly under the hero so a visitor immediately sees there are three readings,
 * and gives each its own crawlable, keyword-bearing entry point (good for SEO too).
 */

import Link from 'next/link';

const PRODUCTS = [
  {
    href: '/pricing',
    plain: 'Hour-by-hour timing',
    title: 'Life Forecast',
    body:
      'Our flagship. Every day mapped into 18 scored hourly windows in plain English — across 7 days, a month, or a full year. Know the best hour to act and the window to avoid.',
    tag: '7-day · Monthly · Annual',
    cta: 'See forecast plans',
    icon: (
      <svg width="40" height="40" viewBox="0 0 48 48" fill="none" aria-hidden>
        <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <path d="M24 10v14l9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="24" cy="24" r="2.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: '/kundali',
    plain: 'Full birth chart',
    title: 'Deep Kundali Analysis',
    body:
      'Your complete Vedic birth chart (Janam Kundali) read in plain English: divisional charts, Manglik, Kaal Sarpa & Sade Sati doshas, seven life areas, and a 5-year outlook.',
    tag: 'One-time report',
    cta: 'Get your Kundali',
    icon: (
      <svg width="40" height="40" viewBox="0 0 48 48" fill="none" aria-hidden>
        <rect x="8" y="8" width="32" height="32" stroke="currentColor" strokeWidth="1" opacity="0.6" rx="2" />
        <line x1="8" y1="8" x2="40" y2="40" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
        <line x1="40" y1="8" x2="8" y2="40" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
        <line x1="24" y1="8" x2="24" y2="40" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
        <line x1="8" y1="24" x2="40" y2="24" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
        <circle cx="24" cy="24" r="3" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: '/synastry',
    plain: 'Compatibility match',
    title: 'Matchmaking · Gun Milan',
    body:
      'Classical 36-point Ashtakoot Kundli matching for two birth charts. The full 8-koota breakdown, Manglik check, and a clear verdict on the match — free score first.',
    tag: 'One-time report',
    cta: 'Check compatibility',
    icon: (
      <svg width="40" height="40" viewBox="0 0 48 48" fill="none" aria-hidden>
        <circle cx="18" cy="24" r="11" stroke="currentColor" strokeWidth="1" opacity="0.6" />
        <circle cx="30" cy="24" r="11" stroke="currentColor" strokeWidth="1" opacity="0.6" />
        <circle cx="24" cy="24" r="3" fill="currentColor" />
      </svg>
    ),
  },
] as const;

export default function Products() {
  return (
    <section aria-labelledby="products-heading" className="py-24 md:py-28 bg-space relative">
      <div className="section-divider absolute top-0 left-0 right-0" />

      <div className="max-w-6xl mx-auto px-6">
        <div className="section-header text-center">
          <p className="section-eyebrow">Three ways to read your chart</p>
          <h2 id="products-heading" className="section-title text-display-md">
            One Jyotish engine. Three readings.
          </h2>
          <p className="section-subtitle text-body-lg mx-auto">
            A precise daily forecast, a full birth-chart analysis, or a compatibility match —
            all built on the same Swiss Ephemeris, Lahiri Ayanamsa core.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {PRODUCTS.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="group card-interactive p-7 md:p-8 relative overflow-hidden block"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-amber scale-x-0 group-hover:scale-x-100 transition-transform duration-350 origin-left rounded-t-card" />

              <div className="text-amber mb-5 transition-transform duration-250 group-hover:scale-105">
                {p.icon}
              </div>

              <h3 className="font-display text-2xl text-star mb-1">{p.title}</h3>
              <p className="font-mono text-mono-sm text-amber/70 tracking-[0.12em] uppercase mb-3">
                {p.plain}
              </p>
              <p className="font-body text-body-sm text-dust leading-relaxed mb-5">{p.body}</p>

              <div className="flex items-center justify-between">
                <span className="font-mono text-mono-sm text-dust">{p.tag}</span>
                <span className="font-body text-body-sm text-amber group-hover:text-amber-light transition-colors">
                  {p.cta} →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
