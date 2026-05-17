/**
 * PricingComparison — detailed feature-by-feature table for users who like
 * full transparency on what each tier includes.
 *
 * Pure presentational. Mobile renders as stacked cards; tablet+ renders as
 * a proper comparison table.
 */

import { Fragment } from 'react';

const FEATURES: { group: string; rows: Array<{ label: string; free: string | boolean; week: string | boolean; month: string | boolean; year: string | boolean }> }[] = [
  {
    group: 'Birth chart',
    rows: [
      { label: 'Free Kundli (Janam Kundali)', free: true, week: true, month: true, year: true },
      { label: 'Lagna + Moon sign + Nakshatra', free: true, week: true, month: true, year: true },
      { label: 'Current Mahadasha + Antardasha', free: true, week: true, month: true, year: true },
      { label: 'Nativity deep-dive (full personalised reading)', free: false, week: false, month: true, year: true },
      { label: 'All 9 grahas with dignities', free: 'summary', week: true, month: true, year: true },
      { label: 'Yogas detected + scripture citations', free: false, week: true, month: true, year: true },
    ],
  },
  {
    group: 'Daily timing',
    rows: [
      { label: 'Hora schedule (24/day)', free: 'sample', week: true, month: true, year: true },
      { label: 'Choghadiya (8 muhurtas/day)', free: false, week: true, month: true, year: true },
      { label: 'Rahu Kaal warnings', free: false, week: true, month: true, year: true },
      { label: 'Hourly Vedic windows (18/day)', free: false, week: true, month: true, year: true },
      { label: 'AI narrative per day', free: false, week: true, month: true, year: true },
      { label: 'Peak / avoid window highlights', free: false, week: true, month: true, year: true },
    ],
  },
  {
    group: 'Forecast horizon',
    rows: [
      { label: '7-day hour-level forecast', free: false, week: true, month: true, year: true },
      { label: '30-day hour-level forecast', free: false, week: false, month: true, year: true },
      { label: 'Weekly synthesis (next 4 weeks)', free: false, week: false, month: true, year: true },
      { label: 'Monthly theme analysis (12 months ahead)', free: false, week: false, month: true, year: true },
      { label: 'Annual Varshaphala synthesis', free: false, week: false, month: false, year: true },
    ],
  },
  {
    group: 'Exports & access',
    rows: [
      { label: 'PDF report', free: false, week: true, month: true, year: true },
      { label: 'Markdown export', free: false, week: true, month: true, year: true },
      { label: 'Re-generate any time', free: 'unlimited', week: 'within plan', month: 'within plan', year: 'within plan' },
      { label: '24h no-questions refund', free: 'n/a', week: true, month: true, year: true },
    ],
  },
];

const PLANS = [
  { key: 'free', label: 'Free Kundli', sub: 'Free' },
  { key: 'week', label: '7-Day Forecast', sub: '7 days' },
  { key: 'month', label: 'Monthly Oracle', sub: '30 days · Most Popular', highlight: true },
  { key: 'year', label: 'Annual Oracle', sub: '365 days · Best Value' },
] as const;

function Cell({ value }: { value: string | boolean }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center justify-center text-success" aria-label="Included">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1" opacity="0.4" />
          <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center justify-center text-dust/30" aria-label="Not included">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <line x1="4" y1="4" x2="12" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="12" y1="4" x2="4" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  return <span className="font-mono text-mono-sm text-amber/80 italic">{value}</span>;
}

export default function PricingComparison() {
  return (
    <section
      aria-labelledby="pricing-comparison-heading"
      className="py-24 md:py-28 bg-space relative"
    >
      <div className="section-divider absolute top-0 left-0 right-0" />

      <div className="max-w-6xl mx-auto px-6">
        <div className="section-header text-center">
          <p className="section-eyebrow">Compare</p>
          <h2 id="pricing-comparison-heading" className="section-title text-display-md">
            What every plan includes
          </h2>
          <p className="section-subtitle text-body-lg mx-auto">
            Full transparency. Pick the depth that matches the decision you&apos;re making.
          </p>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-hidden rounded-card border border-horizon/30 bg-cosmos">
          <table className="w-full">
            <thead className="bg-bg-3">
              <tr>
                <th className="text-left p-4 font-mono text-mono-sm text-dust/60 uppercase tracking-wider w-1/3">
                  Feature
                </th>
                {PLANS.map((p) => (
                  <th
                    key={p.key}
                    className={`p-4 text-center border-l border-horizon/30 ${
                      'highlight' in p && p.highlight ? 'bg-amber/[0.04]' : ''
                    }`}
                  >
                    <div className={`font-body text-headline-sm ${'highlight' in p && p.highlight ? 'text-amber' : 'text-star'}`}>
                      {p.label}
                    </div>
                    <div className="font-mono text-mono-sm text-dust/60 mt-0.5">{p.sub}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((group) => (
                <Fragment key={group.group}>
                  <tr className="bg-bg-3/50">
                    <td colSpan={5} className="p-3 font-mono text-mono-sm text-amber/80 uppercase tracking-[0.12em]">
                      {group.group}
                    </td>
                  </tr>
                  {group.rows.map((r) => (
                    <tr key={`${group.group}-${r.label}`} className="border-t border-horizon/20">
                      <td className="p-4 font-body text-body-sm text-star/85">{r.label}</td>
                      <td className="p-4 text-center border-l border-horizon/20"><Cell value={r.free} /></td>
                      <td className="p-4 text-center border-l border-horizon/20"><Cell value={r.week} /></td>
                      <td className="p-4 text-center border-l border-horizon/20 bg-amber/[0.03]"><Cell value={r.month} /></td>
                      <td className="p-4 text-center border-l border-horizon/20"><Cell value={r.year} /></td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: per-plan cards */}
        <div className="md:hidden space-y-6">
          {PLANS.map((p) => (
            <div
              key={p.key}
              className={`card p-5 ${
                'highlight' in p && p.highlight ? 'border-amber bg-amber/[0.04]' : ''
              }`}
            >
              <div className="mb-4">
                <div className={`font-body text-headline-sm ${'highlight' in p && p.highlight ? 'text-amber' : 'text-star'}`}>
                  {p.label}
                </div>
                <div className="font-mono text-mono-sm text-dust/60 mt-0.5">{p.sub}</div>
              </div>
              <ul className="space-y-2">
                {FEATURES.flatMap((g) =>
                  g.rows
                    .filter((r) => (r as Record<string, unknown>)[p.key] !== false)
                    .map((r) => {
                      const v = (r as Record<string, unknown>)[p.key];
                      return (
                        <li key={`${p.key}-${r.label}`} className="flex items-start gap-2.5">
                          <span className="text-success mt-1 shrink-0">
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                              <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                          <span className="font-body text-body-sm text-star/85">
                            {r.label}
                            {typeof v === 'string' && (
                              <span className="text-amber/70 italic font-mono text-mono-sm ml-1">· {v}</span>
                            )}
                          </span>
                        </li>
                      );
                    })
                )}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
