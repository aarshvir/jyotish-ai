import type { Metadata } from 'next';
import { Suspense } from 'react';
import { headers } from 'next/headers';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { StarField } from '@/components/ui/StarField';
import { currencyFromHeader, getDisplayPrice } from '@/lib/pricing';
import { KundaliForm } from './KundaliForm';

export const metadata: Metadata = {
  title: 'Kundali Analysis — Your Vedic Birth Chart Reading | VedicHour',
  description:
    'A personalized Vedic birth chart (Kundali) reading in plain English — your rising sign, Moon sign, the life chapter you are in now, and what it means for you. $9.99 / ₹899, instant.',
  alternates: { canonical: '/kundali' },
};

const POINTS = [
  { t: 'Who you are', d: 'Your rising sign and Moon sign — your natural strengths, blind spots, and the way you move through life.' },
  { t: 'The chapter you are in', d: 'Your current planetary period (dasha) explained in plain language — what it is activating and how long it lasts.' },
  { t: 'Your life chapters', d: 'A visual timeline of your past, current, and upcoming planetary periods — see where you are in your life.' },
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
            Your birth chart, <span className="text-amber">decoded for you</span>
          </h1>
          <p className="text-body-lg text-dust max-w-2xl mx-auto leading-relaxed">
            A personalized Vedic birth chart reading in plain English — no jargon, no horoscope filler.
            Understand who you are, the life chapter you are in right now, and what it means. Instant.
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
