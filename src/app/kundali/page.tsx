import type { Metadata } from 'next';
import { Suspense } from 'react';
import { headers } from 'next/headers';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { StarField } from '@/components/ui/StarField';
import { currencyFromHeader, getDisplayPrice } from '@/lib/pricing';
import { KundaliForm } from './KundaliForm';

export const metadata: Metadata = {
  title: 'Deep Kundali Report — Your Full Vedic Birth Chart | VedicHour',
  description:
    'A deep, personalized Vedic birth report — your full chart read across career & money, marriage & intimacy, health, children and family, a year-by-year outlook for the next 5 years, and the classical checks (Manglik, Kaal Sarpa, Sade Sati). Computed with the Swiss Ephemeris. $9.99 / ₹899.',
  alternates: { canonical: '/kundali' },
};

const POINTS = [
  { t: 'Every area of life', d: 'Career & money, marriage & intimacy, health, children, and family — each read directly from your chart in plain English, not generic horoscope filler.' },
  { t: 'Your next 5 years', d: 'A year-by-year outlook driven by your exact planetary periods (dasha) — what each year emphasises and how to make the most of it.' },
  { t: 'The classical checks', d: 'Manglik, Kaal Sarpa and Sade Sati assessed from real Swiss Ephemeris calculations — explained clearly, never with fear.' },
];

export default async function KundaliPage() {
  const currency = currencyFromHeader((await headers()).get('x-currency'));
  const priceLabel = getDisplayPrice('kundali', currency);
  return (
    <div className="min-h-screen bg-space text-star flex flex-col relative overflow-hidden">
      <StarField />
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto px-5 sm:px-8 py-16 sm:py-24 relative z-10 w-full">
        <div className="text-center mb-10">
          <p className="section-eyebrow mb-3">Kundali · Birth Chart Reading</p>
          <h1 className="text-display-md font-display text-star mb-4">
            Your birth chart, <span className="text-amber">read in full</span>
          </h1>
          <p className="text-body-lg text-dust max-w-2xl mx-auto leading-relaxed">
            A deep, personalized Vedic birth report in plain English — your character, career &amp; money,
            marriage &amp; intimacy, health, children and family, plus a year-by-year outlook for the next
            five years. Computed from your exact birth moment with the Swiss Ephemeris.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-12 max-w-3xl mx-auto">
          {POINTS.map((p) => (
            <div key={p.t} className="rounded-card border border-horizon/40 bg-cosmos p-5 text-left">
              <h3 className="font-display text-headline-sm text-amber mb-1.5">{p.t}</h3>
              <p className="font-body text-body-sm text-dust leading-relaxed">{p.d}</p>
            </div>
          ))}
        </div>

        <Suspense fallback={<p className="text-center text-dust">Loading form…</p>}>
          <KundaliForm priceLabel={priceLabel} />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
