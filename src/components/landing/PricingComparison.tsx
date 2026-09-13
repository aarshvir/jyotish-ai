/**
 * PricingComparison — feature-by-feature table for people who like full transparency
 * on what each option includes.
 *
 * Pure presentational. Mobile renders as stacked cards; tablet+ renders as a table.
 */

import { Fragment } from 'react';
import { FEATURE_MATRIX, type PlanId } from '@/lib/pricing';

// Single source of truth: the table renders from FEATURE_MATRIX, the SAME data the
// landing Pricing cards and /pricing use, so the three surfaces cannot contradict.
const FEATURES = FEATURE_MATRIX;

const PLANS: readonly { key: PlanId; label: string; sub: string; highlight?: boolean }[] = [
  { key: 'free', label: 'Free calculators', sub: 'No sign-up' },
  { key: 'sub_monthly', label: 'Monthly', sub: 'Recommended', highlight: true },
  { key: 'sub_annual', label: 'Yearly', sub: 'Paid once a year' },
] as const;

function Cell({ value }: { value: string | boolean }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center justify-center text-success" role="img" aria-label="Included">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1" opacity="0.4" />
          <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center justify-center text-dust/30" role="img" aria-label="Not included">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <line x1="4" y1="4" x2="12" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="12" y1="4" x2="4" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  return <span className="font-body text-body-sm text-amber/80 italic">{value}</span>;
}

export default function PricingComparison() {
  return (
    <section aria-labelledby="pricing-comparison-heading" className="py-24 md:py-28 bg-space relative">
      <div className="section-divider absolute top-0 left-0 right-0" />

      <div className="max-w-5xl mx-auto px-6">
        <div className="section-header text-center">
          <p className="section-eyebrow">Compare</p>
          <h2 id="pricing-comparison-heading" className="section-title text-display-md">
            What you get, free and subscribed
          </h2>
          <p className="section-subtitle text-body-lg mx-auto">
            The calculators stay free. Everything written for you comes with a subscription.
          </p>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-hidden rounded-card border border-horizon/30 bg-cosmos">
          <table className="w-full">
            <thead className="bg-bg-3">
              <tr>
                <th className="text-left p-4 font-body text-body-sm text-dust w-2/5">Feature</th>
                {PLANS.map((p) => (
                  <th
                    key={p.key}
                    className={`p-4 text-center border-l border-horizon/30 ${p.highlight ? 'bg-amber/[0.04]' : ''}`}
                  >
                    <div className={`font-body text-headline-sm ${p.highlight ? 'text-amber' : 'text-star'}`}>{p.label}</div>
                    <div className="font-body text-body-sm text-dust mt-0.5">{p.sub}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((group) => (
                <Fragment key={group.group}>
                  <tr className="bg-bg-3/50">
                    <td colSpan={4} className="p-3 font-body text-body-sm text-amber/80">
                      {group.group}
                    </td>
                  </tr>
                  {group.rows.map((r) => (
                    <tr key={`${group.group}-${r.label}`} className="border-t border-horizon/20">
                      <td className="p-4 font-body text-body-sm text-star/85">{r.label}</td>
                      <td className="p-4 text-center border-l border-horizon/20"><Cell value={r.free} /></td>
                      <td className="p-4 text-center border-l border-horizon/20 bg-amber/[0.03]"><Cell value={r.sub_monthly} /></td>
                      <td className="p-4 text-center border-l border-horizon/20"><Cell value={r.sub_annual} /></td>
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
            <div key={p.key} className={`card p-5 ${p.highlight ? 'border-amber bg-amber/[0.04]' : ''}`}>
              <div className="mb-4">
                <div className={`font-body text-headline-sm ${p.highlight ? 'text-amber' : 'text-star'}`}>{p.label}</div>
                <div className="font-body text-body-sm text-dust mt-0.5">{p.sub}</div>
              </div>
              <ul className="space-y-2">
                {FEATURES.flatMap((g) =>
                  g.rows
                    .filter((r) => r[p.key] !== false)
                    .map((r) => {
                      const v = r[p.key];
                      return (
                        <li key={`${p.key}-${r.label}`} className="flex items-start gap-2.5">
                          <span className="text-success mt-1 shrink-0">
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                              <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                          <span className="font-body text-body-sm text-star/85">
                            {r.label}
                            {typeof v === 'string' && <span className="text-amber/70 italic ml-1">· {v}</span>}
                          </span>
                        </li>
                      );
                    }),
                )}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
