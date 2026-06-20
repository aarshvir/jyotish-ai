import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { StarField } from '@/components/ui/StarField';
import { DASHAS } from '@/content/dashas';

export const metadata: Metadata = {
  title: 'Vimshottari Mahadasha — All 9 Planetary Periods Explained',
  description:
    'The 9 Vimshottari Mahadashas explained — each planet’s period length, effects, sub-periods and remedies. Find your current mahadasha free by date of birth.',
  alternates: { canonical: '/dasha' },
};

export default function DashaIndex() {
  return (
    <div className="min-h-screen bg-space text-star flex flex-col relative overflow-hidden">
      <StarField />
      <Navbar />
      <main id="main-content" className="flex-1 max-w-3xl mx-auto px-5 sm:px-8 py-16 sm:py-24 relative z-10 w-full">
        <div className="text-center mb-10">
          <p className="section-eyebrow mb-3">Vimshottari Dasha</p>
          <h1 className="text-display-md font-display text-star mb-4">The 9 <span className="text-amber">Mahadasha</span> Periods</h1>
          <p className="text-body-lg text-dust max-w-2xl mx-auto leading-relaxed">
            Vedic astrology times your life through planetary periods. Each planet rules a mahadasha of a fixed length —
            learn what each emphasises, or <Link href="/vimshottari-dasha-calculator" className="text-amber underline">find your current dasha free</Link>.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {DASHAS.map((d) => (
            <Link key={d.slug} href={`/dasha/${d.slug}`} className="group card-interactive p-4 block flex items-baseline justify-between">
              <h2 className="font-display text-xl text-star group-hover:text-amber-light transition-colors">{d.planet} Mahadasha</h2>
              <span className="font-mono text-mono-sm text-dust">{d.years} yrs</span>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
