'use client';

/**
 * DecideSection — "I want to act on X — when are my best windows?"
 *
 * The single feature most users actually want: a direct answer to
 * "when should I act on [career/money/relationships/health]?"
 *
 * Uses existing per-month domain_scores to rank the best upcoming dates
 * and surfaces the top 3 in plain language. No new data needed.
 */

import { useState, useMemo } from 'react';
import type { MonthSummary } from '@/lib/agents/types';

interface DecideSectionProps {
  months: MonthSummary[];
  /** Best strategic dates from synthesis — preferred source for specific date recommendations */
  strategicWindows?: Array<{ date?: string; reason?: string; score?: number }>;
  /** Per-day data to find best days within months */
  days?: Array<{ date: string; day_score: number }>;
}

type Domain = 'career' | 'money' | 'love' | 'health' | 'intimacy';

const DOMAINS: { key: Domain; label: string; icon: string; description: string }[] = [
  { key: 'career',   label: 'Career',         icon: '🎯', description: 'Decisions, proposals, launches, negotiations' },
  { key: 'money',    label: 'Money',          icon: '💰', description: 'Investments, contracts, financial commitments' },
  { key: 'love',     label: 'Relationships',  icon: '❤️', description: 'Important conversations, commitments, connection' },
  { key: 'health',   label: 'Health',         icon: '🌿', description: 'Treatments, routines, rest, new health habits' },
  { key: 'intimacy', label: 'Intimacy',       icon: '🔥', description: 'Romance, passion, and physical closeness' },
];

const DOMAIN_SCORE_KEY: Record<Domain, 'career' | 'money' | 'relationships' | 'health' | 'intimacy'> = {
  career: 'career',
  money: 'money',
  love: 'relationships',
  health: 'health',
  intimacy: 'intimacy',
};

const STRENGTH_WORD = (score: number) =>
  score >= 70 ? 'Strong' : score >= 55 ? 'Steady' : score >= 45 ? 'Mixed' : 'Challenging';

const STRENGTH_COLOR = (score: number) =>
  score >= 70 ? 'text-success' : score >= 55 ? 'text-amber' : score >= 45 ? 'text-amber/70' : 'text-caution';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function prettyDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${MONTH_NAMES[parseInt(m[2], 10) - 1]} ${parseInt(m[3], 10)}`;
}

function prettyMonth(label: string): string {
  // "April 2026" → "April"
  return label.split(' ')[0] || label;
}

export function DecideSection({ months, strategicWindows, days }: DecideSectionProps) {
  const [selected, setSelected] = useState<Domain>('career');

  const domain = DOMAINS.find((d) => d.key === selected)!;
  const scoreKey = DOMAIN_SCORE_KEY[selected];

  // Rank months by the selected domain score
  const rankedMonths = useMemo(() => {
    const today = new Date();
    return [...months]
      .map((m, idx) => ({
        ...m,
        idx,
        domainScore: m.domain_scores?.[scoreKey] ?? m.score ?? 65,
      }))
      .filter(() => true) // keep all — user may want to plan ahead
      .sort((a, b) => b.domainScore - a.domainScore)
      .slice(0, 4);
  }, [months, scoreKey]);

  // Best specific days from the days array for the selected domain
  // (approximate: use day_score as a proxy since per-day domain scores aren't available)
  const bestDays = useMemo(() => {
    if (!days || days.length === 0) return [];
    const today = new Date();
    return [...days]
      .filter((d) => new Date(d.date + 'T12:00:00') >= today)
      .sort((a, b) => b.day_score - a.day_score)
      .slice(0, 3);
  }, [days]);

  return (
    <div id="decide" className="space-y-6 mb-12 scroll-mt-24">
      <div>
        <p className="section-eyebrow mb-1">Timing intelligence</p>
        <h2 className="font-display font-semibold text-star text-3xl mb-1">
          When should I act on…
        </h2>
        <p className="font-body text-body-sm text-dust/70 max-w-2xl">
          Select the area of your life you want to move on. Your best upcoming windows are shown first.
        </p>
      </div>

      {/* Domain selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {DOMAINS.map((d) => {
          const scoreKey2 = DOMAIN_SCORE_KEY[d.key];
          const monthScores = months.map((m) => m.domain_scores?.[scoreKey2] ?? m.score ?? 65);
          const avg = monthScores.length
            ? Math.round(monthScores.reduce((a, b) => a + b, 0) / monthScores.length)
            : 65;
          const isSelected = selected === d.key;
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => setSelected(d.key)}
              aria-pressed={isSelected}
              className={`rounded-card border p-4 text-left transition-all ${
                isSelected
                  ? 'border-amber bg-amber/10'
                  : 'border-horizon bg-cosmos hover:border-amber/40'
              }`}
            >
              <div className="text-2xl mb-2">{d.icon}</div>
              <div className="font-body text-body-sm text-star font-semibold">{d.label}</div>
              <div className={`font-mono text-mono-sm mt-0.5 ${STRENGTH_COLOR(avg)}`}>
                {STRENGTH_WORD(avg)} overall
              </div>
            </button>
          );
        })}
      </div>

      {/* Results */}
      <div className="rounded-card border border-horizon/40 bg-cosmos p-5 sm:p-6 space-y-5">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{domain.icon}</span>
          <div>
            <h3 className="font-display text-headline-sm text-star">{domain.label}</h3>
            <p className="font-body text-body-sm text-dust/70">{domain.description}</p>
          </div>
        </div>

        {/* Best months for this domain */}
        {rankedMonths.length > 0 && (
          <div>
            <p className="font-mono text-mono-sm text-dust/60 uppercase tracking-wider mb-3">Best months</p>
            <div className="space-y-2">
              {rankedMonths.slice(0, 3).map((m) => (
                <div key={m.idx} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    m.domainScore >= 70 ? 'bg-success' : m.domainScore >= 55 ? 'bg-amber' : 'bg-caution'
                  }`} />
                  <span className="font-body text-body-sm text-star w-24 shrink-0">{prettyMonth(m.month)}</span>
                  <span className={`font-mono text-mono-sm ${STRENGTH_COLOR(m.domainScore)}`}>
                    {STRENGTH_WORD(m.domainScore)} · {m.domainScore}/100
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Best specific days */}
        {bestDays.length > 0 && (
          <div>
            <p className="font-mono text-mono-sm text-dust/60 uppercase tracking-wider mb-3">Best upcoming days</p>
            <div className="space-y-2">
              {bestDays.map((d) => (
                <div key={d.date} className="flex items-center gap-3">
                  <span className="text-success text-sm shrink-0">★</span>
                  <span className="font-mono text-mono-sm text-star w-24 shrink-0">{prettyDate(d.date)}</span>
                  <span className="font-mono text-mono-sm text-dust/70">Score {d.day_score}/100</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strategic windows from synthesis (highest quality signal) */}
        {strategicWindows && strategicWindows.filter((w) => w.date).length > 0 && (
          <div>
            <p className="font-mono text-mono-sm text-dust/60 uppercase tracking-wider mb-3">Priority windows</p>
            <div className="space-y-2">
              {strategicWindows.filter((w) => w.date).slice(0, 3).map((w, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-success text-sm shrink-0 mt-0.5">✓</span>
                  <div>
                    <span className="font-mono text-mono-sm text-success">{prettyDate(w.date!)}</span>
                    {w.reason && (
                      <p className="font-body text-body-sm text-dust/80 mt-0.5">{w.reason}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="font-mono text-mono-sm text-dust/40 border-t border-horizon/30 pt-3">
          For precision timing within a day, check the hourly windows for that date.
        </p>
      </div>
    </div>
  );
}
