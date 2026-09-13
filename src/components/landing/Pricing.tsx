'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { PLAN_CARDS, STANDALONE_PRODUCTS, getDisplayPrice, type PlanId, type SupportedCurrency } from '@/lib/pricing';
import { ShieldCheckIcon } from '@/components/ui/ShieldCheckIcon';
import CurrencySwitcher, { type Currency } from './CurrencySwitcher';

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-amber mt-0.5 shrink-0" aria-hidden>
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Rendered from the same price table checkout charges from, so the shown price is the charged price. */
function priceFor(planId: PlanId, currency: SupportedCurrency): string {
  return planId === 'free' ? 'Free' : getDisplayPrice(planId, currency);
}

function priceNoteFor(planId: PlanId, currency: SupportedCurrency): string {
  if (planId === 'free') return 'No sign-up';
  return `${planId === 'sub_annual' ? 'per year' : 'per month'} · ${currency}`;
}

export default function Pricing() {
  const [currency, setCurrency] = useState<SupportedCurrency>('USD');

  // Only the currency is detected; the amounts always come from the price table.
  useEffect(() => {
    fetch('/api/geo')
      .then((r) => r.json())
      .then((data: { currency?: string }) => {
        if (data.currency === 'INR' || data.currency === 'AED' || data.currency === 'USD') setCurrency(data.currency);
      })
      .catch(() => {
        /* keep USD */
      });
  }, []);

  const handleCurrencyChange = useCallback((c: Currency) => {
    setCurrency(c as SupportedCurrency);
  }, []);

  return (
    <section id="pricing" className="py-24 md:py-28 bg-cosmos relative">
      <div className="section-divider absolute top-0 left-0 right-0" />

      <div className="max-w-6xl mx-auto px-6">
        <div className="section-header text-center">
          <p className="section-eyebrow">Pricing</p>
          <h2 className="section-title text-display-md">Your timing, planned every month.</h2>
          <p className="section-subtitle text-body-lg mx-auto">
            The calculators are free. Your hour-by-hour forecast, written around what you tell us, comes with a
            subscription — and nothing is charged automatically.
          </p>

          <div className="flex justify-center mt-7">
            <CurrencySwitcher initial={currency as Currency} onChange={handleCurrencyChange} size="sm" />
          </div>
        </div>

        {/* Deeper readings — included with a subscription. */}
        <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto mb-10">
          {STANDALONE_PRODUCTS.map((p) => (
            <div key={p.id} className="card p-6 flex flex-col">
              <div className="flex items-baseline justify-between gap-3 mb-2">
                <h3 className="font-body font-semibold text-star text-title-lg">{p.name}</h3>
                <span className="font-body text-body-sm text-amber shrink-0">Included</span>
              </div>
              <p className="font-body text-body-sm text-dust leading-relaxed mb-4 flex-1">{p.description}</p>
              <Link href={p.href} className="btn-secondary justify-center w-full text-body-sm py-2.5">
                {p.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {PLAN_CARDS.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-card transition-all duration-250 ${
                plan.featured
                  ? 'bg-nebula border-2 border-amber shadow-glow-amber'
                  : 'bg-space border border-horizon hover:border-amber/25'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center px-3.5 py-1 rounded-pill bg-amber text-space text-label-sm font-body font-medium whitespace-nowrap">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="p-7 md:p-8 flex flex-col h-full">
                <div className="mb-5">
                  <p className="font-body text-body-sm text-dust mb-2">{plan.name}</p>
                  <div className="flex items-baseline gap-2 min-h-[2.25rem] flex-wrap">
                    <span className="font-body font-semibold text-3xl text-star tabular-nums">
                      {priceFor(plan.id, currency)}
                    </span>
                    <span className="font-body text-body-sm text-dust">{priceNoteFor(plan.id, currency)}</span>
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
                    className={`w-full block text-center py-3 min-h-[44px] rounded-button font-body text-body-md font-medium transition-all duration-200 ${
                      plan.featured ? 'btn-primary justify-center w-full' : 'btn-secondary justify-center w-full'
                    }`}
                  >
                    {plan.cta}
                  </Link>

                  {plan.id !== 'free' && (
                    <div className="flex items-center justify-center gap-2">
                      <ShieldCheckIcon className="w-3.5 h-3.5 text-success shrink-0" />
                      <Link href="/refund" className="font-body text-body-sm text-success/80 hover:underline">
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
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-dust">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="w-3.5 h-3.5 text-success" />
              <span className="font-body text-body-sm">Encrypted and secure</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-success shrink-0" aria-hidden>
                <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" />
              </svg>
              <span className="font-body text-body-sm">Data never sold</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-success shrink-0" aria-hidden>
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="font-body text-body-sm">No automatic charges — you renew yourself</span>
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
                'Anyone curious about Vedic astrology who wants specific, checkable dates',
                'People planning a job change, a marriage decision or a launch',
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
              {['Those seeking medical or legal advice', 'Anyone expecting 100% certainty from any system'].map((item) => (
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
