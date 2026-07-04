'use client';

/**
 * ExitIntentUpsell — a last-chance offer shown to FREE/preview report readers the
 * moment they signal they're leaving (desktop: cursor leaves toward the tab bar;
 * mobile/all: a dwell-time fallback). Fires at most once per browser session
 * (sessionStorage), is dismissible, ESC-closable, and respects reduced motion.
 *
 * Mounted only for preview plans by the report page, so it never shows to a paid
 * reader. Pure client UX — no data, no network.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

const SESSION_KEY = 'vh_exit_upsell_shown';
const DWELL_MS = 35_000; // mobile/desktop fallback if no exit gesture fires

export function ExitIntentUpsell({
  unlockHref = '/onboard?plan=7day&promo=NEWUSER30',
}: {
  unlockHref?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const firedRef = useRef(false);

  const trigger = useCallback(() => {
    if (firedRef.current) return;
    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') return;
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      /* private mode — still show once in-memory */
    }
    firedRef.current = true;
    setOpen(true);
  }, []);

  useEffect(() => {
    // Desktop exit intent: cursor exits through the top of the viewport.
    const onMouseOut = (e: MouseEvent) => {
      if (!e.relatedTarget && e.clientY <= 0) trigger();
    };
    // Fallback so mobile (no mouseleave) still gets one nudge after a long dwell.
    const dwell = window.setTimeout(trigger, DWELL_MS);
    document.addEventListener('mouseout', onMouseOut);
    return () => {
      document.removeEventListener('mouseout', onMouseOut);
      window.clearTimeout(dwell);
    };
  }, [trigger]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="pdf-exclude fixed inset-0 z-[100] flex items-center justify-center p-4 bg-space/80 backdrop-blur-sm"
          data-print-hide
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="exit-upsell-title"
        >
          <motion.div
            className="relative w-full max-w-md rounded-card border border-amber/30 bg-cosmos p-6 sm:p-8 overflow-hidden"
            initial={reduceMotion ? false : { opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pointer-events-none absolute -top-20 -right-16 w-52 h-52 rounded-full bg-amber/12 blur-3xl" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute top-3 right-3 text-dust hover:text-star text-2xl leading-none w-9 h-9 flex items-center justify-center"
            >
              ×
            </button>

            <p className="section-eyebrow mb-2">Before you go</p>
            <h2 id="exit-upsell-title" className="font-display text-headline-sm text-star mb-3">
              Your full answer is one step away
            </h2>
            <p className="font-body text-body-sm text-dust mb-4">
              You&rsquo;ve seen a glimpse. Unlock your complete report and get:
            </p>
            <ul className="space-y-2.5 mb-5">
              {[
                'A direct, written answer to the exact question you came with',
                '18 precision hourly windows a day — know your best hours, not just your best days',
                'Your 12-month timeline so you act with the tide, not against it',
              ].map((b) => (
                <li key={b} className="flex items-start gap-2.5 font-body text-body-sm text-star/90">
                  <span className="text-amber mt-0.5 shrink-0" aria-hidden>✦</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <div className="rounded-md border border-amber/25 bg-amber/[0.06] px-4 py-2.5 mb-5 flex items-center gap-2">
              <span className="font-mono text-mono-sm text-amber">NEWUSER30</span>
              <span className="font-body text-body-sm text-dust">— 30% off your first report, 24-hour money-back guarantee.</span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <Link href={unlockHref} className="btn-primary px-6 py-3 text-sm text-center flex-1">
                Unlock my full answer →
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="font-body text-body-sm text-dust/70 hover:text-star px-4 py-2 transition-colors"
              >
                No thanks
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
