'use client';

/**
 * Visual harness for the checkout hand-off. Not linked from anywhere; it exists so
 * the card that stands between a buyer and Ziina can be reviewed on a real phone
 * without minting a live payment intent.
 */

import { useState } from 'react';
import { PaymentHandoff } from '@/components/checkout/PaymentHandoff';

const CASES = [
  { label: 'India — 7-day @ ₹559 (the real abandoned intent)', productName: 'VedicHour 7-Day Forecast', priceDisplay: '₹559', currency: 'INR' as const },
  { label: 'India — 7-day @ ₹799 (list price)',                productName: 'VedicHour 7-Day Forecast', priceDisplay: '₹799', currency: 'INR' as const },
  { label: 'UAE — Kundali @ AED 36.99',                        productName: 'VedicHour Kundali Analysis', priceDisplay: 'AED 36.99', currency: 'AED' as const },
  { label: 'US — Matchmaking @ $9.99',                         productName: 'VedicHour Matchmaking', priceDisplay: '$9.99', currency: 'USD' as const },
];

export default function CheckoutHandoffPreview() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <main className="min-h-screen bg-space p-6">
      <div className="max-w-md mx-auto">
        <h1 className="font-body font-semibold text-star text-headline-sm mb-1">Checkout hand-off</h1>
        <p className="font-body text-body-sm text-dust mb-6">
          Merchant name renders from NEXT_PUBLIC_ZIINA_MERCHANT_NAME.
        </p>
        <div className="space-y-2">
          {CASES.map((c, i) => (
            <button
              key={c.label}
              type="button"
              onClick={() => setOpen(i)}
              className="w-full text-left px-4 py-3 rounded-card border border-horizon text-star font-body text-body-sm hover:border-amber/40"
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {open !== null && (
        <PaymentHandoff
          productName={CASES[open].productName}
          priceDisplay={CASES[open].priceDisplay}
          currency={CASES[open].currency}
          redirectUrl="#"
          onCancel={() => setOpen(null)}
        />
      )}
    </main>
  );
}
