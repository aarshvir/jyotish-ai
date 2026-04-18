'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import type { SupportedCurrency } from '@/lib/pricing';
import { ShieldCheckIcon } from '@/components/ui/ShieldCheckIcon';

const USD_PRICES: Record<string, string> = {
  '7day': '$9.99',
  monthly: '$19.99',
  annual: '$49.99',
};

const PLANS = [
  {
    id: 'free',
    name: 'Free Kundli',
    description: 'Free Janam Kundali & birth chart',
    features: [
      'Free Kundli (Janam Kundali)',
      'Complete natal birth chart',
      'Lagna + Moon sign analysis',
      'Current Dasha period',
      'Sample Jyotish hora schedule',
    ],
    cta: 'Get Free Kundli',
    href: '/onboard?plan=free',
    featured: false,
    isPaid: false,
  },
  {
    id: '7day',
    name: '7-Day Forecast',
    description: 'Full week of hourly precision',
    features: [
      '126 hourly ratings (0–100)',
      'Hora + choghadiya overlay',
      'Rahu Kaal warnings',
      'AI narrative per day',
      'Best & avoid windows',
    ],
    cta: 'Get 7-Day Forecast',
    href: '/onboard?plan=7day',
    featured: true,
    isPaid: true,
  },
  {
    id: 'monthly',
    name: 'Monthly Oracle',
    description: '30 days of precision guidance',
    features: [
      'Everything in 7-Day',
      '30-day hourly calendar',
      'Nativity profile analysis',
      'Monthly + weekly synthesis',
      'PDF export',
    ],
    cta: 'Get Monthly Oracle',
    href: '/onboard?plan=monthly',
    featured: false,
    isPaid: true,
  },
] as const;


const CURRENCY_LABELS: Record<SupportedCurrency, string> = {
  USD: 'USD',
  INR: 'INR',
  AED: 'AED',
};

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-amber mt-0.5 shrink-0" aria-hidden>
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Pricing() {
  const [currency, setCurrency] = useState<SupportedCurrency>('USD');
  const [prices, setPrices] = useState<Record<string, string>>(USD_PRICES);

  useEffect(() => {
    fetch('/api/geo')
      .then((r) => r.json())
      .then((data) => {
        if (data.currency && data.prices) {
          setCurrency(data.currency as SupportedCurrency);
          const displayPrices: Record<string, string> = {};
          for (const [planId, info] of Object.entries(data.prices as Record<string, { display: string }>)) {
            displayPrices[planId] = info.display;
          }
          setPrices(displayPrices);
        }
      })
      .catch(() => { /* keep USD defaults */ });
  }, []);

  function priceFor(planId: string): string {
    if (planId === 'free') return 'Free';
    return prices[planId] ?? USD_PRICES[planId] ?? '';
  }

  function priceNoteFor(planId: string): string {
    if (planId === 'free') return 'No card required';
    return `one-time · ${CURRENCY_LABELS[currency]}`;
  }

  return (
    <section id="pricing" className="py-24 md:py-28 bg-cosmos relative">
      <div className="section-divider absolute top-0 left-0 right-0" />

      <div className="max-w-6xl mx-auto px-6">
        <div className="section-header text-center">
          <p className="section-eyebrow">Pricing</p>
          <h2 className="section-title text-display-md">
            Free Kundli &amp; Jyotish Forecast Plans
          </h2>
          <p className="section-subtitle text-body-lg mx-auto">
            Free Kundli included. One-time payments for deeper Jyotish forecasts. No subscriptions.
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-card transition-all duration-250 ${
                plan.featured
                  ? 'bg-nebula border-2 border-amber shadow-glow-amber scale-[1.02]'
                  : 'bg-space border border-horizon hover:border-amber/25'
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-px left-0 right-0 h-[2px] bg-amber rounded-t-card" />
              )}
              {plan.featured && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center px-3.5 py-1 rounded-pill bg-amber text-space text-label-sm font-mono font-medium tracking-[0.12em] uppercase whitespace-nowrap">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="p-7 md:p-8 flex flex-col h-full">
                <div className="mb-5">
                  <p className="font-mono text-label-sm text-dust tracking-[0.12em] uppercase mb-2">
                    {plan.name}
                  </p>
                  <div className="flex items-baseline gap-2 min-h-[2.25rem]">
                    <span className="font-body font-semibold text-3xl text-star tabular-nums">
                      {priceFor(plan.id)}
                    </span>
                    <span className="font-mono text-mono-sm text-dust">
                      {priceNoteFor(plan.id)}
                    </span>
                  </div>
                  <p className="font-body text-body-sm text-dust mt-1.5">{plan.description}</p>
                </div>

                <ul className="space-y-2.5 mb-7 flex-1" role="list">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <CheckIcon />
                      <span className="font-body text-body-sm text-dust leading-snug">{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="space-y-3 mt-auto">
                  <Link
                    href={plan.href}
                    className={`w-full block text-center py-3 min-h-[44px] rounded-button font-body text-body-md font-medium tracking-wide transition-all duration-200 ${
                      plan.featured
                        ? 'btn-primary justify-center w-full'
                        : 'btn-secondary justify-center w-full'
                    }`}
                  >
                    {plan.cta}
                  </Link>

                  {plan.isPaid && (
                    <div className="flex items-center justify-center gap-2">
                      <ShieldCheckIcon className="w-3.5 h-3.5 text-success shrink-0" />
                      <Link href="/refund" className="font-mono text-mono-sm text-success/80 hover:underline">
                        24-hour money-back guarantee
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust bar */}
        <div className="mt-12 md:mt-14 text-center">
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-dust/60">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="w-3.5 h-3.5 text-success" />
              <span className="font-mono text-mono-sm">Encrypted & secure</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-success shrink-0" aria-hidden>
                <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2"/>
              </svg>
              <span className="font-mono text-mono-sm">Data never sold</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-success shrink-0" aria-hidden>
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="font-mono text-mono-sm">Real Swiss Ephemeris</span>
            </div>
          </div>
        </div>

        {/* Who this is for */}
        <div className="mt-14 grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <div className="card p-6">
            <h3 className="font-body text-headline-sm text-star mb-3">Who this is for</h3>
            <ul className="space-y-2">
              {[
                'People who make timing-sensitive decisions',
                'Anyone curious about Vedic astrology with data-backed results',
                'Entrepreneurs, investors, and professionals who track windows',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="text-success mt-0.5 shrink-0">✓</span>
                  <span className="font-body text-body-sm text-dust">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-6">
            <h3 className="font-body text-headline-sm text-star mb-3">Not for</h3>
            <ul className="space-y-2">
              {[
                'Those seeking medical or legal advice',
                'Anyone expecting 100% certainty from any system',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="text-caution mt-0.5 shrink-0">✕</span>
                  <span className="font-body text-body-sm text-dust">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
