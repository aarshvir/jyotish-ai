'use client';

import { useEffect, useRef } from 'react';
import { handoffCopy, type CheckoutCurrency } from '@/lib/checkout/handoffCopy';

/**
 * The bridge between our page and Ziina's hosted checkout.
 *
 * Why this exists: every payment intent this platform has ever created — all two
 * of them — reached Ziina's page and was abandoned WITHOUT a card being entered
 * (Ziina reports both as `requires_payment_instrument`). The redirect used to be
 * a hard cut from a branded Vedic site to a UAE fintech page headed "Pay
 * aarshvir", with Apple Pay / Google Pay on top and no UPI anywhere. A buyer who
 * is not told that is coming reads it as a scam and leaves.
 *
 * So we say, in advance, exactly what the next screen will look like. Naming the
 * surprise before it happens is what keeps it from reading as fraud.
 */

export interface PaymentHandoffProps {
  /** What they're buying, e.g. "VedicHour 7-Day Forecast". */
  productName: string;
  /** Pre-formatted, already discounted, e.g. "₹559". Never do math in the view. */
  priceDisplay: string;
  /** Ziina's hosted page for this intent. */
  redirectUrl: string;
  /** Drives the India-specific card guidance. */
  currency: CheckoutCurrency;
  /**
   * Merchant name EXACTLY as Ziina renders it. Defaults from
   * NEXT_PUBLIC_ZIINA_MERCHANT_NAME because the Ziina account currently displays a
   * personal name ("aarshvir"), not the brand. Promising "Pay VedicHour" while the
   * page says "Pay aarshvir" would do more damage than saying nothing, so this must
   * track reality — flip the env var the moment the Ziina dashboard is renamed.
   */
  merchantName?: string;
  onCancel: () => void;
}

export function PaymentHandoff({
  productName,
  priceDisplay,
  redirectUrl,
  currency,
  merchantName = process.env.NEXT_PUBLIC_ZIINA_MERCHANT_NAME || 'aarshvir',
  onCancel,
}: PaymentHandoffProps) {
  const continueRef = useRef<HTMLAnchorElement>(null);

  // Focus the primary action so keyboard and screen-reader users land on it, and
  // let Escape back out — this sits between a buyer and their money, so it must
  // never feel like a trap.
  useEffect(() => {
    continueRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const copy = handoffCopy(currency, merchantName);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="handoff-title"
    >
      <div className="w-full sm:max-w-md bg-cosmos border border-horizon rounded-t-card sm:rounded-card p-5 sm:p-6 max-h-[92vh] overflow-y-auto">
        <h2 id="handoff-title" className="font-body font-semibold text-star text-headline-sm mb-1">
          One more step
        </h2>
        <p className="font-body text-body-sm text-dust mb-5">
          We&rsquo;re handing you to Ziina, our payment partner. Here&rsquo;s what to expect.
        </p>

        <div className="flex items-baseline justify-between gap-3 pb-4 mb-4 border-b border-horizon">
          <span className="font-body text-body-sm text-dust-light">{productName}</span>
          <span className="font-body font-semibold text-star text-headline-sm tabular-nums">{priceDisplay}</span>
        </div>

        <ul className="space-y-3 mb-5">
          <li className="flex gap-3">
            <span aria-hidden="true" className="text-amber shrink-0">1.</span>
            <p className="font-body text-body-sm text-dust-light">
              The next page is <strong className="text-star">Ziina</strong> — it will say{' '}
              <strong className="text-star">&ldquo;Pay {merchantName}&rdquo;</strong> and show{' '}
              <strong className="text-star tabular-nums">{priceDisplay}</strong>.
              {copy.explainMerchantName && (
                <> <strong className="text-star">{merchantName}</strong> is the VedicHour
                account holder — that&rsquo;s us, not a stranger.</>
              )}
            </p>
          </li>
          <li className="flex gap-3">
            <span aria-hidden="true" className="text-amber shrink-0">2.</span>
            <p className="font-body text-body-sm text-dust-light">
              Scroll past Apple&nbsp;Pay / Google&nbsp;Pay to{' '}
              <strong className="text-star">&ldquo;Or pay with card&rdquo;</strong> and enter any
              Visa or Mastercard.
            </p>
          </li>
          {copy.showInternationalCardHelp && (
            <li className="flex gap-3">
              <span aria-hidden="true" className="text-amber shrink-0">3.</span>
              <p className="font-body text-body-sm text-dust-light">
                <strong className="text-star">Indian cards:</strong> Ziina is licensed in the UAE, so
                this counts as an international payment. Most Indian banks keep those switched off by
                default. If your card is declined, enable{' '}
                <strong className="text-star">&ldquo;international / online transactions&rdquo;</strong>{' '}
                in your bank app and try again — it takes about a minute.
              </p>
            </li>
          )}
        </ul>

        {copy.showUpiNote && (
          <p className="font-body text-body-sm text-dust mb-5">
            UPI isn&rsquo;t available yet — we&rsquo;re working on it. Card only for now.
          </p>
        )}

        <a
          ref={continueRef}
          href={redirectUrl}
          className="block w-full text-center rounded-card bg-amber text-ink font-body font-semibold text-body-md py-3.5 transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-amber/60"
        >
          Continue to secure payment
        </a>

        <button
          type="button"
          onClick={onCancel}
          className="block w-full text-center font-body text-body-sm text-dust hover:text-dust-light py-3 mt-1"
        >
          Go back
        </button>

        <p className="font-body text-body-sm text-dust/70 text-center mt-2">
          Payments handled by Ziina, licensed by the Central Bank of the UAE.
          We never see your card details.
        </p>
      </div>
    </div>
  );
}
