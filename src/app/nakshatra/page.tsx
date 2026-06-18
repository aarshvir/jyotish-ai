import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { StarField } from '@/components/ui/StarField';
import { NAKSHATRAS } from '@/content/nakshatras';

export const metadata: Metadata = {
  title: 'The 27 Nakshatras — Vedic Birth Stars, Traits & Compatibility | VedicHour',
  description:
    'Explore all 27 nakshatras (Vedic birth stars): ruling planet, deity, gana, nadi, yoni, personality traits and compatibility. Find your janma nakshatra free.',
  alternates: { canonical: '/nakshatra' },
};

export default function NakshatraIndex() {
  return (
    <div className="min-h-screen bg-space text-star flex flex-col relative overflow-hidden">
      <StarField />
      <Navbar />
      <main id="main-content" className="flex-1 max-w-4xl mx-auto px-5 sm:px-8 py-16 sm:py-24 relative z-10 w-full">
        <div className="text-center mb-10">
          <p className="section-eyebrow mb-3">The 27 Nakshatras</p>
          <h1 className="text-display-md font-display text-star mb-4">Vedic Birth Stars (<span className="text-amber">Nakshatras</span>)</h1>
          <p className="text-body-lg text-dust max-w-2xl mx-auto leading-relaxed">
            Each of the 27 nakshatras shapes temperament, career, and compatibility through its ruling planet, deity, and gana.
            Pick yours below — or <Link href="/nakshatra-finder" className="text-amber underline">find your nakshatra free</Link>.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {NAKSHATRAS.map((n) => (
            <Link key={n.slug} href={`/nakshatra/${n.slug}`} className="group card-interactive p-4 block">
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-xl text-star group-hover:text-amber-light transition-colors">{n.name}</h2>
                <span className="font-mono text-mono-sm text-dust/40">#{n.order}</span>
              </div>
              <p className="font-mono text-mono-sm text-dust/60 mt-1">{n.lord} · {n.gana}</p>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
