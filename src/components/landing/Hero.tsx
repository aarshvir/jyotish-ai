'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { StarField } from '@/components/ui/StarField';
import { MandalaRing } from '@/components/ui/MandalaRing';

const PROOF_POINTS = [
  { value: 'Free Kundli',     label: 'No card needed' },
  { value: '18',              label: 'Hourly Vedic windows / day' },
  { value: '24h',             label: 'No-questions refund' },
];

const wordContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.2 } },
};
const wordItem = {
  hidden: { opacity: 0, y: 32 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};
const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
});

const HEADLINE = ['Your', 'Jyotish', 'Forecast,', 'Decoded', 'Hour', 'by', 'Hour.'];

export default function Hero() {
  return (
    <section className="relative min-h-[100svh] flex flex-col items-center justify-center overflow-hidden bg-space">
      <StarField />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center select-none">
        <MandalaRing className="w-[600px] h-[600px] md:w-[700px] md:h-[700px] text-amber opacity-[0.05]" />
      </div>

      <div className="relative z-10 text-center max-w-4xl mx-auto px-6 pt-24 pb-16 md:pt-32 md:pb-20">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="inline-flex items-center gap-2 mb-8 md:mb-10 px-4 py-1.5 rounded-pill border border-amber/20 bg-amber/[0.04]"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse-amber" />
          <span className="font-mono text-mono-sm text-amber tracking-[0.15em] uppercase">
            Swiss Ephemeris · Lahiri Ayanamsa · Vimshottari Dasha
          </span>
        </motion.div>

        {/* Headline — serif display, reserved for hero only */}
        <motion.h1
          variants={wordContainer}
          initial="hidden"
          animate="show"
          className="font-display font-semibold text-star mb-6 text-display-xl tracking-tight"
        >
          {HEADLINE.map((word, i) => (
            <motion.span
              key={i}
              variants={wordItem}
              className="inline-block mr-[0.2em]"
            >
              {word === 'Hour.' ? (
                <span className="text-amber-gradient">{word}</span>
              ) : word === 'Jyotish' ? (
                <span className="text-amber">{word}</span>
              ) : (
                word
              )}
            </motion.span>
          ))}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          {...fadeUp(0.75)}
          className="font-body text-body-lg text-dust max-w-xl mx-auto mb-10 leading-relaxed"
        >
          AI-powered Vedic astrology &amp; free Kundli online — with hourly precision.
          <br className="hidden md:block" />
          Know exactly when to act — and when to rest.
        </motion.p>
        {/* Hidden SEO anchor text — visible to crawlers, hidden from users */}
        <span className="sr-only">
          Free Kundli generator · Janam Kundali online · AI Jyotish forecast · Vedic astrology report ·
          Jyotish AI · Vedic forecast · Astrology report · AI kundli
        </span>

        {/* CTAs */}
        <motion.div
          {...fadeUp(0.9)}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-14 md:mb-16"
        >
          <Link href="/onboard?plan=free" className="btn-primary text-base px-8 py-3.5 group">
            <span>See today&#39;s windows — free</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="group-hover:translate-x-0.5 transition-transform" aria-hidden>
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <Link href="#hourly-preview" className="btn-secondary text-base px-8 py-3.5">
            See sample report
          </Link>
        </motion.div>

        {/* Proof points */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          {PROOF_POINTS.map((s) => (
            <div
              key={s.value}
              className="flex items-center gap-3 px-5 py-2.5 rounded-button bg-cosmos/80 border border-horizon/50"
            >
              <span className="font-mono text-mono-md text-amber font-medium tracking-wider">
                {s.value}
              </span>
              <span className="font-body text-body-sm text-dust">{s.label}</span>
            </div>
          ))}
        </motion.div>
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-space to-transparent" />
    </section>
  );
}
