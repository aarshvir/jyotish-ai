import Link from 'next/link';
import { StarField } from '@/components/ui/StarField';
import { MandalaRing } from '@/components/ui/MandalaRing';

const TRUST_STATS = [
  { value: '12,000+', label: 'charts generated' },
  { value: '★ 4.8', label: 'from 340+ seekers' },
  { value: '18', label: 'hourly Vedic windows/day' },
  { value: '24h', label: 'no-questions refund' },
];

/*
 * Server Component — no 'use client'.
 * All animations are pure CSS (globals.css animate-* classes) so no
 * Framer Motion ships in the critical above-fold JS bundle.
 * The H1 is fully visible from SSR for optimal LCP.
 */
export default function Hero() {
  return (
    <section className="relative min-h-[100svh] flex flex-col items-center justify-center overflow-hidden bg-space">
      <StarField />

      {/* Premium Glow & Aurora */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="aura-glow animate-aurora" />
      </div>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center select-none">
        <MandalaRing className="w-[600px] h-[600px] md:w-[800px] md:h-[800px] text-amber opacity-[0.08] animate-slow-spin" />
      </div>

      <div className="relative z-10 text-center max-w-4xl mx-auto px-6 pt-24 pb-16 md:pt-32 md:pb-20">
        {/* Eyebrow — CSS fade-down */}
        <div className="animate-fade-down inline-flex items-center gap-2 mb-8 md:mb-10 px-4 py-1.5 rounded-pill border border-amber/20 bg-amber/[0.04]">
          <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse-amber" />
          <span className="font-mono text-mono-sm text-amber tracking-[0.15em] uppercase">
            Swiss Ephemeris · Lahiri Ayanamsa · Vimshottari Dasha
          </span>
        </div>

        {/*
         * H1 — LCP element. Rendered fully visible from SSR (no animation, no opacity:0).
         * LCP fires immediately on first paint.
         */}
        <h1 className="font-display font-semibold text-star mb-6 text-display-xl tracking-tight">
          <span className="inline-block mr-[0.2em]">Your</span>{' '}
          <span className="inline-block mr-[0.2em] text-amber">Jyotish</span>{' '}
          <span className="inline-block mr-[0.2em]">Forecast,</span>{' '}
          <span className="inline-block mr-[0.2em]">Decoded</span>{' '}
          <span className="inline-block mr-[0.2em]">Hour</span>{' '}
          <span className="inline-block mr-[0.2em]">by</span>{' '}
          <span className="inline-block text-amber-gradient">Hour.</span>
        </h1>

        {/* Subtitle — CSS fade-up */}
        <p className="animate-fade-up-1 font-body text-body-lg text-dust max-w-xl mx-auto mb-10 leading-relaxed">
          AI-powered Vedic astrology &amp; free Kundli online — with hourly precision.
          <br className="hidden md:block" />
          Know exactly when to act — and when to rest.
        </p>
        {/* Supplementary SEO text for crawlers */}
        <span className="sr-only">
          Free Kundli generator · Janam Kundali online · AI Jyotish forecast · Vedic astrology report ·
          Jyotish AI · Vedic forecast · Astrology report · AI kundli
        </span>

        {/* Primary CTA — single high-contrast action */}
        <div className="animate-fade-up-2 flex flex-col items-center gap-3 mb-4">
          <Link href="/onboard?plan=free" className="btn-primary text-base px-10 py-4 w-full max-w-xs sm:max-w-none sm:w-auto group">
            <span>Get Your Free Kundli</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="group-hover:translate-x-0.5 transition-transform" aria-hidden>
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <Link href="#hourly-preview" className="font-body text-body-sm text-dust/60 hover:text-dust underline-offset-2 hover:underline transition-colors">
            Or preview a sample report →
          </Link>
        </div>

        {/* Trust bar — social proof */}
        <div className="animate-fade-in-1 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mb-10 md:mb-12">
          {TRUST_STATS.map((s) => (
            <div key={s.value} className="flex items-center gap-1.5">
              <span className="font-mono text-mono-md text-amber font-medium tracking-wider">{s.value}</span>
              <span className="font-body text-body-sm text-dust/60">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-space to-transparent" />
    </section>
  );
}
