'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { DEFAULT_SLUG, getQuizSlug } from '@/config/quiz_slugs';
import { funnelPersonalContext } from '@/lib/quiz/personalContext';
import { loadState } from '@/lib/funnel/state';
import { trackEvent } from '@/lib/analytics/client';
import { formatAmount } from '@/lib/ziina/amounts';
import { PaymentHandoff } from '@/components/checkout/PaymentHandoff';
import type { OfferInfo } from '@/components/funnel/OfferScreen';

/**
 * S18 + S19, after a paid blueprint. Ziina cannot charge a saved card without the buyer
 * (no stored cards), so the "one-click" upsell is a second, separate card payment and the
 * screen says so. S18 offers the monthly 30-day forecast; declining shows the 7-day
 * down-sell only when it has a real checkout plan, otherwise goes straight to S19.
 * S19: delivery, and a share link with no incentive claims (spec).
 */

type Step = 'upsell' | 'downsell' | 'done';
type Currency = 'INR' | 'USD' | 'AED';

export function Thanks({ slugKey }: { slugKey: string }) {
  const params = useSearchParams();
  const slug = getQuizSlug(slugKey) ?? getQuizSlug(DEFAULT_SLUG)!;
  const reportId = params.get('r') ?? '';
  const [step, setStep] = useState<Step>('upsell');
  const [offer, setOffer] = useState<OfferInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [handoff, setHandoff] = useState<{ priceDisplay: string; redirectUrl: string; currency: Currency } | null>(null);

  useEffect(() => {
    fetch('/api/quiz/offer', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((o: OfferInfo | null) => o && setOffer(o))
      .catch(() => {});
  }, []);

  const monthly = offer?.prices.sub_monthly ?? null;
  const downsell = offer?.prices.downsell_7day ?? null;

  useEffect(() => {
    if (step === 'upsell' && monthly) trackEvent('upsell_view', { offer: 'sub_monthly' }, { slug: slug.slug });
  }, [step, monthly, slug.slug]);

  async function acceptMonthly() {
    if (busy) return;
    const st = loadState(slug.slug);
    const a = st?.answers;
    if (!a?.birth_date || !a.birth_city_lat) {
      setNote('We could not find your birth details on this device, so we cannot add the forecast from here.');
      return;
    }
    setBusy(true);
    setNote(null);
    const known = a.birth_time_known === 'exact' || a.birth_time_known === 'approx';
    try {
      const r = await fetch('/api/ziina/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          planType: 'sub_monthly',
          reportId: crypto.randomUUID(),
          name: st?.contact?.name ?? '',
          birth_date: a.birth_date,
          birth_time: known && a.birth_time ? `${a.birth_time}:00` : '12:00:00',
          birth_city: a.birth_city,
          birth_lat: Number(a.birth_city_lat),
          birth_lng: Number(a.birth_city_lng),
          current_city: a.current_city || a.birth_city,
          current_lat: Number(a.current_city_lat || a.birth_city_lat),
          current_lng: Number(a.current_city_lng || a.birth_city_lng),
          personal_context: funnelPersonalContext(a, slug),
        }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string; redirectUrl?: string; amount?: number; currency?: string };
      if (!r.ok || !j.redirectUrl) {
        setNote(j.error ?? 'We could not start the payment. Please try again.');
        return;
      }
      trackEvent('upsell_accept', { offer: 'sub_monthly', value: (j.amount ?? 0) / 100, currency: j.currency }, { slug: slug.slug });
      const currency: Currency = j.currency === 'INR' || j.currency === 'AED' ? j.currency : 'USD';
      setHandoff({ priceDisplay: formatAmount(j.amount ?? 0, currency), redirectUrl: j.redirectUrl, currency });
    } catch {
      setNote('Network problem — please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  function decline() {
    trackEvent('upsell_decline', { offer: 'sub_monthly' }, { slug: slug.slug });
    setStep(downsell ? 'downsell' : 'done');
  }

  return (
    <main className="min-h-screen bg-space px-4 py-8">
      <div className="max-w-md mx-auto">
        {step === 'upsell' && (
          <section>
            <p className="font-body text-label-md text-amber-light mb-3">Payment received</p>
            <h1 className="font-display font-semibold text-star text-[1.75rem] leading-[1.15] mb-3">Add your 30-day hour-by-hour forecast?</h1>
            <p className="font-body text-body-lg text-dust-light mb-5">
              The same birth chart, turned into your next 30 days: every hour scored, with the best and the hardest windows marked.
            </p>
            <p className="font-body text-body-md text-dust mb-5">
              This is a separate card payment{monthly ? ` of ${monthly.display}` : ''} for one month. Nothing renews by itself: we remind you before it ends, and you renew with one tap or simply stop.
            </p>
            {note && (
              <p role="alert" className="mb-4 font-body text-body-md text-caution-light">
                {note}
              </p>
            )}
            <button type="button" disabled={busy || !monthly} onClick={() => void acceptMonthly()} className="btn-primary w-full min-h-[52px] font-body text-[1.0625rem] font-semibold">
              {busy ? 'Starting secure payment…' : monthly ? `Add my 30 days — ${monthly.display}` : 'Add my 30 days'}
            </button>
            <button type="button" onClick={decline} className="block w-full text-center mt-3 py-3 font-body text-body-md text-dust underline underline-offset-4">
              No thanks, take me to my blueprint
            </button>
          </section>
        )}

        {step === 'downsell' && downsell && (
          <section>
            <h1 className="font-display font-semibold text-star text-[1.75rem] leading-[1.15] mb-3">Prefer a shorter look? 7 days.</h1>
            <p className="font-body text-body-lg text-dust-light mb-5">Your next 7 days, hour by hour, for {downsell.display}. One payment, no renewal.</p>
            <button
              type="button"
              onClick={() => {
                trackEvent('downsell_accept', { offer: 'downsell_7day', value: downsell.amount / 100 }, { slug: slug.slug });
                setStep('done');
              }}
              className="btn-primary w-full min-h-[52px] font-body text-[1.0625rem] font-semibold"
            >
              Add 7 days — {downsell.display}
            </button>
            <button type="button" onClick={() => setStep('done')} className="block w-full text-center mt-3 py-3 font-body text-body-md text-dust underline underline-offset-4">
              No thanks
            </button>
          </section>
        )}

        {step === 'done' && (
          <section>
            <p className="font-body text-label-md text-amber-light mb-3">All set</p>
            <h1 className="font-display font-semibold text-star text-[1.75rem] leading-[1.15] mb-3">Your Karmic Blueprint is on its way.</h1>
            <p className="font-body text-body-lg text-dust-light mb-6">
              It opens on the web and downloads as a PDF. We also keep it under your account, so you can come back to it.
            </p>
            {reportId && (
              <Link href={`/report/${reportId}?payment_status=paid`} className="btn-primary w-full min-h-[52px] font-body text-[1.0625rem] font-semibold">
                Open my blueprint
              </Link>
            )}
            <p className="mt-6 font-body text-body-md text-dust-light">Tip: add VedicHour to your home screen from your browser menu, so it is one tap away.</p>
            <p className="mt-6 font-body text-body-md text-dust">
              Know someone who keeps asking the same question?{' '}
              <Link href={`/q/${slug.slug}`} className="text-indigo underline underline-offset-4">
                Send them this quiz
              </Link>
              .
            </p>
          </section>
        )}
      </div>

      {handoff && (
        <PaymentHandoff
          productName="VedicHour Monthly Subscription"
          priceDisplay={handoff.priceDisplay}
          redirectUrl={handoff.redirectUrl}
          currency={handoff.currency}
          onCancel={() => setHandoff(null)}
        />
      )}
    </main>
  );
}
