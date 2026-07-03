'use client';

/**
 * PersonalizedAnswer — answers the seeker's onboarding question at the very top
 * of their report. This is the conversion spine:
 *   - preview → question echo + an empathetic teaser that starts to answer, then
 *     a locked "your full answer" with 3 specific unlock bullets + a hard CTA.
 *   - full → the question answered directly + the exact timing windows.
 * Fetches /api/reports/[id]/personalized (on-demand, idempotent). Renders nothing
 * when there's no question on file or generation is unavailable.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';

interface Personalized {
  tier: 'preview' | 'full';
  question_echo: string;
  teaser?: string;
  unlock_points?: string[];
  full_answer?: string;
  key_windows?: string[];
}

export function PersonalizedAnswer({
  reportId,
  isPreview,
  unlockHref = '/onboard?plan=7day',
}: {
  reportId: string;
  isPreview: boolean;
  unlockHref?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [data, setData] = useState<Personalized | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/reports/${reportId}/personalized`, { method: 'POST' });
        const j = (await res.json().catch(() => ({}))) as { personalized?: Personalized | null };
        if (!cancelled) setData(j.personalized ?? null);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reportId]);

  if (loading) {
    return (
      <div className="mb-8 rounded-card border border-amber/20 bg-cosmos p-6 animate-pulse" aria-hidden>
        <div className="h-3 w-40 bg-nebula/60 rounded-sm mb-4" />
        <div className="h-4 w-3/4 bg-nebula/50 rounded-sm mb-2" />
        <div className="h-4 w-2/3 bg-nebula/40 rounded-sm" />
      </div>
    );
  }
  if (!data || !data.question_echo) return null;

  const enter = reduceMotion
    ? {}
    : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 } };

  // ── FULL (paid): the answer, direct ──────────────────────────────────────
  if (data.tier === 'full' && data.full_answer) {
    return (
      <motion.section
        id="your-question"
        {...enter}
        className="mb-10 rounded-card border border-amber/30 bg-gradient-to-br from-amber/[0.07] via-cosmos to-cosmos p-6 sm:p-8 relative overflow-hidden scroll-mt-24"
      >
        <div className="pointer-events-none absolute -top-20 -right-16 w-52 h-52 rounded-full bg-amber/10 blur-3xl" />
        <p className="section-eyebrow mb-2">Your question, answered</p>
        <p className="font-display text-headline-sm text-star mb-4 max-w-2xl">{data.question_echo}</p>
        <p className="font-body text-body text-dust/90 leading-relaxed whitespace-pre-line max-w-2xl">
          {data.full_answer}
        </p>
        {data.key_windows && data.key_windows.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {data.key_windows.map((w, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-pill border border-amber/25 bg-amber/[0.06] px-3 py-1.5 font-mono text-mono-sm text-amber/90"
              >
                <span aria-hidden>★</span> {w}
              </span>
            ))}
          </div>
        )}
      </motion.section>
    );
  }

  // ── PREVIEW (free): teaser + locked answer + unlock CTA ───────────────────
  if (data.tier === 'preview' && data.teaser) {
    return (
      <motion.section
        id="your-question"
        {...enter}
        className="mb-10 rounded-card border border-amber/30 bg-gradient-to-br from-amber/[0.07] via-cosmos to-cosmos p-6 sm:p-8 relative overflow-hidden scroll-mt-24"
      >
        <div className="pointer-events-none absolute -top-20 -right-16 w-52 h-52 rounded-full bg-amber/12 blur-3xl" />
        <p className="section-eyebrow mb-2">You asked</p>
        <p className="font-display text-headline-sm text-star mb-4 max-w-2xl">{data.question_echo}</p>
        <p className="font-body text-body text-dust/90 leading-relaxed max-w-2xl">{data.teaser}</p>

        {/* Locked full answer */}
        <div className="mt-6 rounded-card border border-amber/25 bg-space/60 p-5 relative">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-amber" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
            </svg>
            <p className="font-mono text-mono-sm text-amber uppercase tracking-wider">Your full answer is ready</p>
          </div>
          <p className="font-body text-body-sm text-dust mb-3">Unlock your complete report to see:</p>
          <ul className="space-y-2.5 mb-5">
            {(data.unlock_points ?? []).map((pt, i) => (
              <li key={i} className="flex items-start gap-2.5 font-body text-body-sm text-star/90">
                <span className="text-amber mt-0.5 shrink-0" aria-hidden>✦</span>
                <span>{pt}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <Link href={unlockHref} className="btn-primary px-6 py-3 text-sm">
              Unlock my full answer →
            </Link>
            <span className="font-mono text-mono-sm text-dust/60">24-hour money-back guarantee</span>
          </div>
        </div>
      </motion.section>
    );
  }

  return null;
}
