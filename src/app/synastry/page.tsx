import { Suspense } from 'react';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import { StarField } from '@/components/ui/StarField';
import { SynastryForm } from './SynastryForm';

export default function SynastryPage() {
  return (
    <div className="min-h-screen bg-space text-star flex flex-col relative overflow-hidden">
      <StarField />
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto px-5 sm:px-8 py-16 sm:py-24 relative z-10 w-full">
        <div className="text-center mb-12">
          <h1 className="text-display-md font-body text-star mb-4">
            Ashtakoot <span className="text-amber">Synastry</span>
          </h1>
          <p className="text-body-lg text-dust max-w-2xl mx-auto leading-relaxed">
            Eight-fold compatibility (36 points max) from both Moons. Use any paid VedicHour forecast on your account,
            or purchase standalone Synastry access below.
          </p>
        </div>
        <Suspense fallback={<p className="text-center text-dust">Loading form…</p>}>
          <SynastryForm />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
