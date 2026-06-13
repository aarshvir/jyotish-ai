import type { Metadata } from 'next';
import { Suspense } from 'react';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { StarField } from '@/components/ui/StarField';
import { SynastryForm } from './SynastryForm';

export const metadata: Metadata = {
  title: 'Kundli Matching & Marriage Compatibility (Gun Milan) — VedicHour',
  description:
    'Free-to-start Vedic matchmaking. Enter two birth details and get your 36-point Ashtakoot Gun Milan score with a full eight-fold compatibility breakdown. $9.99 / ₹899.',
  alternates: { canonical: '/synastry' },
};

const STEPS = [
  { n: '36', label: 'point compatibility score' },
  { n: '8', label: 'areas of life compared' },
  { n: '2 min', label: 'instant result' },
];

export default function SynastryPage() {
  return (
    <div className="min-h-screen bg-space text-star flex flex-col relative overflow-hidden">
      <StarField />
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto px-5 sm:px-8 py-16 sm:py-24 relative z-10 w-full">
        <div className="text-center mb-10">
          <p className="section-eyebrow mb-3">Kundli Matching · Gun Milan</p>
          <h1 className="text-display-md font-display text-star mb-4">
            How compatible are <span className="text-amber">you two?</span>
          </h1>
          <p className="text-body-lg text-dust max-w-2xl mx-auto leading-relaxed">
            Enter both birth details and get your <strong className="text-star">36-point compatibility score</strong> with
            a full breakdown across eight areas of life — temperament, mindset, health, and more. The classical
            Ashtakoot Gun Milan that Indian families have used for generations, computed instantly.
          </p>
          <div className="flex items-center justify-center gap-6 sm:gap-10 mt-7">
            {STEPS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-display text-2xl sm:text-3xl text-amber">{s.n}</div>
                <div className="font-mono text-mono-sm text-dust/60 max-w-[8rem]">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <Suspense fallback={<p className="text-center text-dust">Loading form…</p>}>
          <SynastryForm />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
