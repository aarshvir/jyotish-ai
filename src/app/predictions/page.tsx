import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { StarField } from '@/components/ui/StarField';
import { PREDICTIONS } from '@/content/predictions';

export const metadata: Metadata = {
  title: 'Life Predictions by Date of Birth — Career, Marriage, Wealth, Health | VedicHour',
  description:
    'Free Vedic life predictions by date of birth: what your chart says about career, marriage, wealth, health and education, with timing from your dasha.',
  alternates: { canonical: '/predictions' },
};

export default function PredictionsIndex() {
  return (
    <div className="min-h-screen bg-space text-star flex flex-col relative overflow-hidden">
      <StarField />
      <Navbar />
      <main id="main-content" className="flex-1 max-w-3xl mx-auto px-5 sm:px-8 py-16 sm:py-24 relative z-10 w-full">
        <div className="text-center mb-10">
          <p className="section-eyebrow mb-3">Predictions by date of birth</p>
          <h1 className="text-display-md font-display text-star mb-4">What Your Chart Says About <span className="text-amber">Your Life</span></h1>
          <p className="text-body-lg text-dust max-w-2xl mx-auto leading-relaxed">
            Vedic readings for the areas that matter most — grounded in the houses, planets, and timing of your birth chart.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PREDICTIONS.map((p) => (
            <Link key={p.slug} href={`/predictions/${p.slug}`} className="group card-interactive p-5 block">
              <h2 className="font-display text-xl text-star group-hover:text-amber-light transition-colors mb-1">{p.title}</h2>
              <p className="font-body text-body-sm text-dust leading-relaxed">{p.description}</p>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
