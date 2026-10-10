'use client';

import { PLAN_CARDS } from '@/lib/pricing';

/**
 * S17 — the offer. Two honest states:
 *  • blueprint OPEN  → ₹199 Full Karmic Blueprint + unticked ₹99 order bump (spec S17).
 *  • blueprint CLOSED (default until the Phase 4 generator ships) → the blueprint is shown
 *    as "opening soon", and the product that can be delivered today — the existing 30-day
 *    hour-by-hour subscription — is offered instead. No price is shown that checkout
 *    would refuse, and no strike-through prices (H4).
 */

export interface OfferInfo {
  currency: string;
  country: string | null;
  blueprintOpen: boolean;
  prices: {
    blueprint: { amount: number; display: string } | null;
    bump: { amount: number; display: string } | null;
    blueprint_plus30: { amount: number; display: string } | null;
    sub_monthly: { amount: number; display: string } | null;
  };
}

const INSIDE = [
  'Chart snapshot, and Ketu and Rahu in depth: house, sign, nakshatra, conjunctions and aspects',
  'The Rahu–Ketu axis as your life theme',
  'Your 5th and 9th houses: past merit and dharma',
  'The life chapter (dasha) you are in now, and the date it changes',
  'Your karmic-debt house, with practical, non-medical ways to ease it',
  'Rahu–Ketu sensitive windows for the next 12 months',
  'A chapter on the area you chose',
];

function Trust({ items }: { items: string[] }) {
  return (
    <ul className="mt-5 grid gap-2">
      {items.map((x) => (
        <li key={x} className="flex gap-2 font-body text-body-md text-ink-soft">
          <span aria-hidden className="text-[#226B48]">✓</span>
          {x}
        </li>
      ))}
    </ul>
  );
}

export function OfferScreen({
  offer,
  focusLabel,
  bump,
  onBump,
  busy,
  banner,
  contactLabel,
  onBuyBlueprint,
  onBuySubscription,
  onAddContact,
}: {
  offer: OfferInfo | null;
  focusLabel: string | null;
  bump: boolean;
  onBump: (v: boolean) => void;
  busy: boolean;
  banner: string | null;
  contactLabel: string | null;
  onBuyBlueprint: () => void;
  onBuySubscription: () => void;
  onAddContact: () => void;
}) {
  const p = offer?.prices;
  const monthly = PLAN_CARDS.find((c) => c.id === 'sub_monthly');

  return (
    <div className="-mx-4 px-4 pt-6 pb-10 bg-parchment min-h-[70vh] rounded-t-[20px]">
      {banner && (
        <p role="alert" className="mb-4 px-4 py-3 rounded-[12px] border border-[#C75B3A]/40 bg-[rgba(199,91,58,.08)] font-body text-body-md text-[#8E3418]">
          {banner}
        </p>
      )}

      {offer?.blueprintOpen && p?.blueprint ? (
        <section>
          <p className="font-body text-label-md text-indigo-deep mb-2">Web + PDF · 12–16 pages</p>
          <h1 className="font-display font-semibold text-ink text-[2rem] leading-[1.1] mb-3">Full Karmic Blueprint</h1>
          <p className="font-display font-semibold text-ink text-[2.25rem] tabular-nums mb-4">{p.blueprint.display}</p>
          <ul className="space-y-2 mb-5">
            {INSIDE.map((x) => (
              <li key={x} className="flex gap-2 font-body text-[1rem] leading-relaxed text-ink-muted">
                <span aria-hidden className="text-[#8A6318]">•</span>
                {x === 'A chapter on the area you chose' && focusLabel ? `A chapter on ${focusLabel.toLowerCase()}` : x}
              </li>
            ))}
          </ul>
          {p.bump && (
            <label className="flex items-start gap-3 rounded-[14px] border-2 border-dashed border-[#B5862F] bg-[#F8EDD4] px-4 py-4 cursor-pointer">
              <input type="checkbox" checked={bump} onChange={(e) => onBump(e.target.checked)} className="mt-1 w-5 h-5 shrink-0 accent-[#B5862F] [color-scheme:light]" />
              <span className="font-body text-[1rem] text-ink">
                <strong className="font-semibold">+ Your next 30 days:</strong> Rahu–Ketu sensitive days and your best hours —{' '}
                <span className="tabular-nums">{p.bump.display}</span>
              </span>
            </label>
          )}
          <button type="button" onClick={onBuyBlueprint} disabled={busy} className="btn-primary w-full min-h-[52px] mt-5 font-body text-[1.0625rem] font-semibold">
            {busy
              ? 'Starting secure payment…'
              : `Unlock my full blueprint — ${bump && p.blueprint_plus30 ? p.blueprint_plus30.display : p.blueprint.display}`}
          </button>
          <Trust
            items={[
              '24-hour refund, no questions asked',
              'Calculated with Swiss Ephemeris astronomy',
              'Your birth details are never sold',
              'One payment. Nothing is charged automatically.',
            ]}
          />
          <p className="mt-3 font-body text-body-sm text-ink-soft">Card payment through Ziina. UPI is not available yet.</p>
        </section>
      ) : (
        <section>
          <article className="rounded-[14px] border border-paper-line bg-white px-5 py-5 mb-6">
            <p className="font-body text-label-md text-indigo-deep mb-2">Opening soon</p>
            <h1 className="font-display font-semibold text-ink text-[1.625rem] leading-tight mb-2">Full Karmic Blueprint</h1>
            <p className="font-body text-[1rem] leading-relaxed text-ink-muted">
              The full 12–16 page blueprint is still being finished, so it is not on sale yet.{' '}
              {contactLabel ? `We have ${contactLabel} and will tell you when it opens.` : 'Leave a WhatsApp number or email and we will tell you when it opens.'}
            </p>
            {!contactLabel && (
              <button type="button" onClick={onAddContact} className="btn-secondary mt-4 min-h-[48px] px-5 font-body text-ink border-paper-line">
                Tell me when it opens
              </button>
            )}
          </article>

          <p className="font-body text-label-md text-indigo-deep mb-2">Available today</p>
          <h2 className="font-display font-semibold text-ink text-[1.75rem] leading-[1.15] mb-2">{monthly?.description ?? 'Your next 30 days, planned hour by hour'}</h2>
          <p className="font-body text-[1rem] text-ink-muted mb-4">From the same birth chart, written around what you told us{focusLabel ? ` about ${focusLabel.toLowerCase()}` : ''}.</p>
          <ul className="space-y-2 mb-5">
            {(monthly?.features ?? []).map((x) => (
              <li key={x} className="flex gap-2 font-body text-[1rem] leading-relaxed text-ink-muted">
                <span aria-hidden className="text-[#226B48]">✓</span>
                {x}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={onBuySubscription}
            disabled={busy || !p?.sub_monthly}
            className="btn-primary w-full min-h-[52px] font-body text-[1.0625rem] font-semibold"
          >
            {busy ? 'Starting secure payment…' : p?.sub_monthly ? `Start my 30 days — ${p.sub_monthly.display} a month` : 'Start my 30 days'}
          </button>
          <Trust
            items={[
              'Nothing is charged automatically — renew with one tap, or simply stop',
              'Calculated with Swiss Ephemeris astronomy',
              'Your birth details are never sold',
            ]}
          />
          <p className="mt-3 font-body text-body-sm text-ink-soft">Card payment through Ziina. UPI is not available yet.</p>
        </section>
      )}
    </div>
  );
}
