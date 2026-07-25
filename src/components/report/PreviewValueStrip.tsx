'use client';

/**
 * PreviewValueStrip — the free preview's proof-of-value and its curiosity gap.
 *
 * Shows the seeker's REAL next-30-day score curve (deterministic ephemeris, no LLM
 * spend) with their strongest and hardest dates named. The numbers are free and
 * verifiable against their own life; the INTERPRETATION — why each day scores what
 * it does, and the hour-by-hour windows inside it — is what they buy.
 *
 * Preview-only. Renders nothing until real data arrives.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';

interface TeaserDay { date: string; score: number }

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function pretty(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${MONTHS[Math.max(0, Math.min(11, +m[2] - 1))]} ${+m[3]}`;
}
function weekday(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return isNaN(d.getTime()) ? '' : ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()];
}
function barColor(score: number): string {
  if (score >= 65) return '#10b981';
  if (score >= 45) return '#f59e0b';
  return '#ef4444';
}

export function PreviewValueStrip({
  reportId,
  firstName,
  unlockHref = '/onboard?plan=7day&promo=NEWUSER30',
}: {
  reportId: string;
  firstName?: string;
  unlockHref?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [days, setDays] = useState<TeaserDay[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/reports/${reportId}/teaser`, { method: 'POST' });
        const j = (await res.json().catch(() => ({}))) as { teaser?: { days?: TeaserDay[] } | null };
        if (!cancelled) setDays(j.teaser?.days ?? null);
      } catch {
        if (!cancelled) setDays(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reportId]);

  if (loading) {
    return (
      <div className="mb-10 rounded-card border border-horizon/40 bg-cosmos p-6 animate-pulse" aria-hidden>
        <div className="h-3 w-52 bg-nebula/60 rounded-sm mb-4" />
        <div className="h-24 w-full bg-nebula/40 rounded-sm" />
      </div>
    );
  }
  if (!days || days.length < 5) return null;

  const sorted = [...days].sort((a, b) => b.score - a.score);
  const best = sorted[0];
  const second = sorted[1];
  const worst = sorted[sorted.length - 1];
  const max = Math.max(...days.map((d) => d.score), 1);
  const name = (firstName || '').trim();

  return (
    <motion.section
      id="preview-value"
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-10 rounded-card border border-amber/30 bg-gradient-to-br from-amber/[0.06] via-cosmos to-cosmos p-6 sm:p-8 relative overflow-hidden scroll-mt-24"
    >
      <div className="pointer-events-none absolute -top-24 -right-20 w-60 h-60 rounded-full bg-amber/10 blur-3xl" />

      <p className="section-eyebrow mb-2">Your next 30 days · already calculated</p>
      <h2 className="font-display text-headline-sm text-star mb-4 max-w-2xl">
        {name ? `${name}, your timing is not flat — ` : 'Your timing is not flat — '}
        these are your real highs and lows
      </h2>

      {/* The curve — real scores, no interpretation */}
      <div className="flex items-end gap-[3px] h-24 mb-3" role="img" aria-label="Your day scores for the next 30 days">
        {days.map((d, i) => (
          <motion.div
            key={d.date}
            className="flex-1 rounded-t-sm min-w-[3px]"
            style={{ backgroundColor: barColor(d.score), opacity: 0.85 }}
            initial={reduceMotion ? false : { height: 0 }}
            animate={{ height: `${Math.max(8, (d.score / max) * 100)}%` }}
            transition={{ duration: 0.5, delay: reduceMotion ? 0 : i * 0.012, ease: 'easeOut' }}
            title={`${pretty(d.date)} · ${d.score}/100`}
          />
        ))}
      </div>
      <div className="flex justify-between font-mono text-mono-sm text-dust/50 mb-6">
        <span>{pretty(days[0].date)}</span>
        <span>{pretty(days[days.length - 1].date)}</span>
      </div>

      {/* The named dates — specific, verifiable, personal */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="rounded-md bg-success/[0.07] border border-success/25 p-4">
          <p className="font-mono text-mono-sm text-success uppercase tracking-wider mb-1">Your strongest day</p>
          <p className="font-display text-2xl text-star">{pretty(best.date)}</p>
          <p className="font-body text-body-sm text-dust">{weekday(best.date)} · scores {best.score}/100</p>
        </div>
        <div className="rounded-md bg-success/[0.04] border border-success/15 p-4">
          <p className="font-mono text-mono-sm text-success/80 uppercase tracking-wider mb-1">Runner-up</p>
          <p className="font-display text-2xl text-star">{pretty(second.date)}</p>
          <p className="font-body text-body-sm text-dust">{weekday(second.date)} · scores {second.score}/100</p>
        </div>
        <div className="rounded-md bg-caution/[0.07] border border-caution/25 p-4">
          <p className="font-mono text-mono-sm text-caution uppercase tracking-wider mb-1">Move with care</p>
          <p className="font-display text-2xl text-star">{pretty(worst.date)}</p>
          <p className="font-body text-body-sm text-dust">{weekday(worst.date)} · scores {worst.score}/100</p>
        </div>
      </div>

      {/* The gap */}
      <div className="rounded-card border border-amber/25 bg-space/60 p-5">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-amber" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
          </svg>
          <p className="font-mono text-mono-sm text-amber uppercase tracking-wider">
            The dates are yours. The reasons are locked.
          </p>
        </div>
        <ul className="space-y-2.5 mb-5">
          {[
            `Why ${pretty(best.date)} is your strongest day — and the exact hours inside it to use`,
            `What makes ${pretty(worst.date)} heavy, and how to work around it instead of through it`,
            'All 30 days explained in plain English, hour by hour — plus your year ahead',
          ].map((t) => (
            <li key={t} className="flex items-start gap-2.5 font-body text-body-sm text-star/90">
              <span className="text-amber mt-0.5 shrink-0" aria-hidden>✦</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-3">
          <Link href={unlockHref} className="btn-primary px-6 py-3 text-sm">
            Unlock the reasons →
          </Link>
          <span className="font-mono text-mono-sm text-dust/60">
            30% off with NEWUSER30 · 24-hour money-back guarantee
          </span>
        </div>
      </div>
    </motion.section>
  );
}
