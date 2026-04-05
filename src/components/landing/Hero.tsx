'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { StarField } from '@/components/ui/StarField';
import { MandalaRing } from '@/components/ui/MandalaRing';

const STATS = [
  { value: '10,000+', label: 'Reports Generated' },
  { value: '94%',     label: 'Accuracy vs AstroSage' },
  { value: '7 Days',  label: 'of Hourly Data' },
];

const wordContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.25 } },
};
const wordItem = {
  hidden: { opacity: 0, y: 36, skewY: 2 },
  show:   { opacity: 1, y: 0, skewY: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};
const statContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 1.15 } },
};
const statItem = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

// Headline words, first line = display color, rest = amber for "Hour."
const WORDS = ['Your', 'Life,', 'Decoded', 'Hour', 'by', 'Hour.'];

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-space">
      <StarField />

      {/* Mandala texture */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center select-none">
        <MandalaRing className="w-[700px] h-[700px] text-amber opacity-[0.08]" />
      </div>

      <div className="relative z-10 text-center max-w-5xl mx-auto px-6 pt-24 pb-16">
        {/* Eyebrow badge */}
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="inline-flex items-center gap-2.5 mb-10 px-4 py-1.5 rounded-full border border-amber/25 bg-amber/5"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse" />
          <span className="font-mono text-xs text-amber tracking-[0.2em] uppercase">
            VedicHour · Swiss Ephemeris · Lahiri Ayanamsa · Vimshottari Dasha
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={wordContainer}
          initial="hidden"
          animate="show"
          className="font-display font-semibold text-star mb-6 leading-[1.0]"
          style={{ fontSize: 'clamp(54px, 7.5vw, 100px)' }}
        >
          {WORDS.map((word, i) => (
            <motion.span
              key={i}
              variants={wordItem}
              style={{ display: 'inline-block', marginRight: '0.22em' }}
            >
              {word === 'Hour.' ? (
                <span
                  style={{
                    background: 'linear-gradient(135deg, #F59E0B 0%, #FCD34D 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {word}
                </span>
              ) : (
                word
              )}
            </motion.span>
          ))}
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          className="font-body text-dust text-lg md:text-xl max-w-xl mx-auto mb-10 leading-relaxed"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.8 }}
        >
          AI-powered Vedic astrology forecasts with hourly precision.
          <br className="hidden md:block" />
          Know exactly when to act — and when to rest.
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.95 }}
        >
          <Link
            href="/onboard"
            className="group relative inline-flex items-center gap-2 px-8 py-3.5 bg-amber text-space font-body font-medium text-base rounded-sm hover:bg-amber-glow transition-colors duration-200 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 focus-visible:ring-offset-space"
          >
            <span className="relative z-10">Generate My Report</span>
            <svg
              width="16" height="16" viewBox="0 0 16 16" fill="none"
              className="relative z-10 group-hover:translate-x-0.5 transition-transform"
            >
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <Link
            href="#hourly-preview"
            className="inline-flex items-center gap-2 px-8 py-3.5 border border-horizon text-dust font-body text-base rounded-sm hover:border-amber/40 hover:text-star transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/60 focus-visible:ring-offset-2 focus-visible:ring-offset-space"
          >
            See Sample Report
          </Link>
        </motion.div>

        {/* Stat pills */}
        <motion.div
          variants={statContainer}
          initial="hidden"
          animate="show"
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          {STATS.map((s) => (
            <motion.div
              key={s.value}
              variants={statItem}
              className="flex items-center gap-3 px-5 py-2.5 rounded-sm bg-cosmos border border-horizon/70"
            >
              <span className="font-mono text-sm text-amber tracking-wider font-medium">
                {s.value}
              </span>
              <span className="font-body text-sm text-dust">{s.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Gradient fade to next section */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-space to-transparent" />
    </section>
  );
}
