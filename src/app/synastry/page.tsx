import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { StarField } from '@/components/ui/StarField';
import Link from 'next/link';

export default function SynastryPage() {
  return (
    <div className="min-h-screen bg-space text-star flex flex-col relative overflow-hidden">
      <StarField />
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-5 sm:px-8 py-20 sm:py-32 relative z-10 w-full flex items-center justify-center">
        <div className="card p-8 md:p-12 text-center border border-amber/30 shadow-glow-amber relative overflow-hidden max-w-2xl w-full">
          {/* Subtle background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-amber/5 rounded-full blur-[80px] pointer-events-none" />

          <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-pill bg-amber/10 border border-amber/30 text-amber text-sm font-mono tracking-wide uppercase">
            <span className="w-2 h-2 rounded-full bg-amber animate-pulse"></span>
            In Development
          </div>

          <h1 className="text-display-md font-body text-star mb-6 px-4">
            Ashtakoot Synastry
            <br className="hidden sm:block" />
            <span className="text-amber italic font-light">&amp; Compatibility</span>
          </h1>

          <p className="text-body-lg text-dust max-w-lg mx-auto mb-10 leading-relaxed">
            The grandmaster engine is currently learning multi-player Jyotish. 
            Soon, you will be able to calculate precise romantic compatibility, 
            kuta matching, and synastry grids between your chart and a partner&apos;s chart.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12 text-left">
            {[
              { label: 'Guna Milan', val: 'Out of 36' },
              { label: 'Manglik Dosha', val: 'Cancellation logic' },
              { label: 'Bhakoot / Nadi', val: 'Vitality matching' }
            ].map(f => (
              <div key={f.label} className="bg-space/50 border border-horizon rounded-lg p-5">
                <div className="text-amber mb-2 text-xl">✦</div>
                <div className="font-semibold text-star text-sm mb-1">{f.label}</div>
                <div className="text-xs text-dust">{f.val}</div>
              </div>
            ))}
          </div>

          <Link href="/" className="btn-primary px-8 py-3 w-full sm:w-auto inline-flex justify-center">
            Return to Dashboard
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
