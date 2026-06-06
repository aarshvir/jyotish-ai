'use client';

/**
 * ForecastSnapshot — the summary-first hero at the very top of the report.
 *
 * Phase 1 of the report rehaul: it makes the report SUMMARY-FIRST and plain-language
 * by surfacing the most life-shaped data that already exists (current-year theme,
 * period synthesis, per-domain priorities, and the best/caution date windows) — which
 * was previously buried at the BOTTOM of the page. No new generation; pure presentation.
 *
 * Phase 2 will replace the composed copy here with a purpose-built "what will happen in
 * your life" generation pass. Until then this is honestly labelled "at a glance".
 *
 * Emotional arc: recognition -> orientation -> agency. Plain language only; no Sanskrit.
 */

import { useState } from 'react';
import type { PeriodSynthesis, MonthSummary } from '@/lib/agents/types';

interface ForecastSnapshotProps {
  name: string;
  synthesis?: PeriodSynthesis;
  months?: MonthSummary[];
  currentYearTheme?: string;
  lifeThemes?: string[];
  /** Preview (free) shows a teaser version. */
  preview?: boolean;
}

/** First 1–2 sentences of a paragraph, for a scannable thesis line. */
function leadSentences(text: string | undefined, max = 2): string {
  if (!text) return '';
  const clean = text.replace(/\s+/g, ' ').trim();
  const parts = clean.match(/[^.!?]+[.!?]+/g);
  if (!parts) return clean;
  return parts.slice(0, max).join(' ').trim();
}

/** One clean, plain line from a domain-priority blob. */
function oneLine(text: string | undefined): string {
  return plainify(leadSentences(text, 1) || (text ?? ''));
}

/** "2026-06-24" -> "Jun 24". */
function prettyDate(iso: string | undefined): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mi = Math.max(0, Math.min(11, parseInt(m[2], 10) - 1));
  return `${months[mi]} ${parseInt(m[3], 10)}`;
}

/** Average a domain across the 12 months -> 0–100, then a plain trend word. */
function domainAverage(months: MonthSummary[] | undefined, key: keyof MonthSummary['domain_scores']): number | null {
  if (!months || months.length === 0) return null;
  const vals = months.map((m) => m.domain_scores?.[key]).filter((v): v is number => typeof v === 'number' && v > 0);
  if (vals.length === 0) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function trendWord(score: number | null): { word: string; tone: 'good' | 'mixed' | 'tender' } {
  if (score == null) return { word: 'Unfolding', tone: 'mixed' };
  if (score >= 68) return { word: 'Strong', tone: 'good' };
  if (score >= 55) return { word: 'Steady', tone: 'good' };
  if (score >= 45) return { word: 'Mixed', tone: 'mixed' };
  return { word: 'Tender', tone: 'tender' };
}

function toneClass(tone: 'good' | 'mixed' | 'tender'): string {
  if (tone === 'good') return 'text-success';
  if (tone === 'tender') return 'text-caution';
  return 'text-amber';
}

/** Plain-English replacements for the most common Sanskrit/technical terms. */
const JARGON: [RegExp, string][] = [
  [/\bbenefics?\b/gi, 'favourable'],
  [/\bmalefics?\b/gi, 'challenging'],
  [/\bmahadasha\b/gi, 'main life-period'],
  [/\bantardasha\b/gi, 'sub-period'],
  [/\bpratyantardasha\b/gi, 'micro-period'],
  [/\bdashas?\b/gi, 'life-period'],
  [/\bhoras\b/gi, 'planetary hours'],
  [/\bhora\b/gi, 'planetary hour'],
  [/\blagnas?\b/gi, 'rising sign'],
  [/\bnakshatras?\b/gi, 'birth star'],
  [/\bgrahas?\b/gi, 'planet'],
  [/\brashis?\b/gi, 'sign'],
  [/\brasis?\b/gi, 'sign'],
  [/\bgochar\b/gi, 'transit'],
];

/**
 * Presentation-layer plain-language guard. The hero is the #1 "plain English"
 * surface, so it must never show raw jargon even when its data source does:
 * it drops a leading ALL-CAPS "section header" sentence (LLM scaffolding) and
 * swaps common Sanskrit terms for everyday words.
 */
function plainify(text: string | undefined): string {
  if (!text) return '';
  let t = String(text).replace(/\s+/g, ' ').trim();
  const stop = t.search(/[.!?]/);
  if (stop > 10) {
    const head = t.slice(0, stop);
    const letters = head.replace(/[^a-zA-Z]/g, '');
    const upper = head.replace(/[^A-Z]/g, '');
    if (letters.length > 8 && upper.length / letters.length > 0.6) {
      t = t.slice(stop + 1).trim();
    }
  }
  for (const [re, rep] of JARGON) t = t.replace(re, rep);
  return t.replace(/\s+/g, ' ').trim();
}

/** Guaranteed-plain thesis built from structured data when no clean theme exists. */
function constructedThesis(
  domains: { label: string; score: number | null }[],
  best?: { date?: string },
  watch?: { date?: string },
): string {
  const scored = domains.filter((d): d is { label: string; score: number } => typeof d.score === 'number');
  let lead: string;
  if (scored.length >= 2) {
    const top = [...scored].sort((a, b) => b.score - a.score)[0];
    const low = [...scored].sort((a, b) => a.score - b.score)[0];
    lead = top.label !== low.label && top.score - low.score >= 4
      ? `The year ahead looks strongest for ${top.label.toLowerCase()}, and asks for a little more patience with ${low.label.toLowerCase()}.`
      : 'The year ahead looks broadly steady across the main areas of your life.';
  } else {
    lead = 'Your forecast highlights the strongest windows ahead and where to move with care.';
  }
  const parts = [lead];
  if (best?.date) parts.push(`Your strongest opening is around ${prettyDate(best.date)}.`);
  if (watch?.date) parts.push(`Ease off a little around ${prettyDate(watch.date)}.`);
  return parts.join(' ');
}

export function ForecastSnapshot({ name, synthesis, months, currentYearTheme, lifeThemes, preview }: ForecastSnapshotProps) {
  const [showFull, setShowFull] = useState(false);

  const firstName = (name || 'Your').trim().split(/\s+/)[0] || 'Your';
  const possessive = /s$/i.test(firstName) ? `${firstName}'` : `${firstName}'s`;

  const dp = synthesis?.domain_priorities;
  const domains = [
    { label: 'Career', line: oneLine(dp?.career), score: domainAverage(months, 'career') },
    { label: 'Money', line: oneLine(dp?.money), score: domainAverage(months, 'money') },
    { label: 'Love', line: oneLine(dp?.relationships), score: domainAverage(months, 'relationships') },
    { label: 'Health', line: oneLine(dp?.health), score: domainAverage(months, 'health') },
  ];

  const best = (synthesis?.strategic_windows ?? []).filter((w) => w?.date).slice(0, 3);
  const watch = (synthesis?.caution_dates ?? []).filter((w) => w?.date).slice(0, 2);

  // Thesis: a clean current-year theme if we have one, otherwise a guaranteed-plain
  // line built from structured data. Never surface raw jargon as the headline.
  const cleanTheme = plainify(leadSentences(currentYearTheme, 2));
  const thesis = cleanTheme.length > 40 ? cleanTheme : constructedThesis(domains, best[0], watch[0]);

  // Three "what's shifting" lines (plain). Reuse the strongest domain copy.
  const shifts = [
    dp?.career && { tag: 'Career & public life', text: oneLine(dp.career) },
    dp?.money && { tag: 'Money & stability', text: oneLine(dp.money) },
    dp?.relationships && { tag: 'Love, family & home', text: oneLine(dp.relationships) },
  ].filter(Boolean) as { tag: string; text: string }[];

  return (
    <section id="snapshot" aria-labelledby="snapshot-heading" className="mb-12 scroll-mt-24">
      <div className="rounded-card border border-amber/25 bg-gradient-to-br from-amber/[0.06] via-cosmos to-cosmos p-6 sm:p-8 md:p-10 relative overflow-hidden">
        <div className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 rounded-full bg-amber/10 blur-3xl" />

        <p className="section-eyebrow mb-2">Your forecast at a glance</p>
        <h2 id="snapshot-heading" className="font-display text-display-sm md:text-display-md text-star leading-tight mb-2">
          {possessive} year ahead
        </h2>
        <p className="font-mono text-mono-sm text-dust/60 mb-6 max-w-2xl">
          Drawn from your birth chart and timing cycles. These are your strongest windows and
          tendencies — guidance to act on, not fixed outcomes.
        </p>

        {/* The thesis — the one-line story of the period */}
        <p className="font-body text-body-lg md:text-headline-sm text-star/90 leading-relaxed max-w-3xl mb-6">
          {thesis}
        </p>

        {/* What's shifting — 3 plain lines */}
        {shifts.length > 0 && (
          <div className="grid sm:grid-cols-3 gap-3 mb-6">
            {shifts.map((s) => (
              <div key={s.tag} className="rounded-md bg-bg-3/60 border border-horizon/30 p-4">
                <p className="font-mono text-mono-sm text-amber/80 tracking-wider uppercase mb-1.5">{s.tag}</p>
                <p className="font-body text-body-sm text-dust leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Timing chips — best opening / go slower */}
        {(best[0] || watch[0]) && (
          <div className="flex flex-wrap gap-3 mb-6">
            {best[0] && (
              <div className="inline-flex items-center gap-2 rounded-pill bg-success/10 border border-success/30 px-4 py-2">
                <span className="font-mono text-mono-sm text-success uppercase tracking-wider">Best opening</span>
                <span className="font-body text-body-sm text-star">{prettyDate(best[0].date)}{best[0].reason ? ` — ${oneLine(best[0].reason)}` : ''}</span>
              </div>
            )}
            {watch[0] && (
              <div className="inline-flex items-center gap-2 rounded-pill bg-caution/10 border border-caution/30 px-4 py-2">
                <span className="font-mono text-mono-sm text-caution uppercase tracking-wider">Go slower</span>
                <span className="font-body text-body-sm text-star">{prettyDate(watch[0].date)}{watch[0].reason ? ` — ${oneLine(watch[0].reason)}` : ''}</span>
              </div>
            )}
          </div>
        )}

        {/* Five domain cards (Family is conditional + responsible) */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          {domains.map((d) => {
            const t = trendWord(d.score);
            return (
              <div key={d.label} className="rounded-md bg-bg-3/40 border border-horizon/30 p-4 flex flex-col">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-body text-body-sm text-star font-semibold">{d.label}</span>
                  <span className={`font-mono text-mono-sm ${toneClass(t.tone)}`}>{t.word}</span>
                </div>
                <p className="font-body text-mono-sm text-dust/80 leading-snug">{d.line || 'A steady area this period — no major swings expected.'}</p>
              </div>
            );
          })}
          {/* Family & children — conditional, responsible (no predictions about specific people) */}
          <div className="rounded-md bg-bg-3/40 border border-horizon/30 p-4 flex flex-col">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-body text-body-sm text-star font-semibold">Family</span>
              <span className="font-mono text-mono-sm text-amber">If relevant</span>
            </div>
            <p className="font-body text-mono-sm text-dust/80 leading-snug">
              If children or family are part of your life, this period favours planning,
              honest conversations, and steady support more than forcing big changes.
            </p>
          </div>
        </div>

        {/* Moments that matter */}
        {(best.length > 0 || watch.length > 0) && !preview && (
          <div className="rounded-md bg-cosmos/60 border border-horizon/30 p-4 mb-2">
            <p className="font-mono text-mono-sm text-dust/60 uppercase tracking-wider mb-3">Moments that matter</p>
            <ul className="space-y-2">
              {best.map((w, i) => (
                <li key={`b${i}`} className="flex items-start gap-3 font-body text-body-sm">
                  <span className="font-mono text-success shrink-0 w-16">{prettyDate(w.date)}</span>
                  <span className="text-star/85">{oneLine(w.reason) || 'A strong window — good for important moves.'}</span>
                </li>
              ))}
              {watch.map((w, i) => (
                <li key={`w${i}`} className="flex items-start gap-3 font-body text-body-sm">
                  <span className="font-mono text-caution shrink-0 w-16">{prettyDate(w.date)}</span>
                  <span className="text-star/85">{oneLine(w.reason) || 'Move with care — better for patience than big launches.'}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Full picture (expand) */}
        {synthesis?.opening_paragraph && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setShowFull((v) => !v)}
              className="font-mono text-mono-sm text-amber hover:text-amber-glow transition-colors min-h-[44px] inline-flex items-center"
            >
              {showFull ? 'Hide the full picture ▲' : 'Read the full picture ▼'}
            </button>
            {showFull && (
              <div className="mt-3 space-y-3 max-w-3xl">
                <p className="font-body text-body-md text-dust leading-relaxed">{plainify(synthesis.opening_paragraph)}</p>
                {synthesis.closing_paragraph && (
                  <p className="font-body text-body-md text-dust/85 leading-relaxed">{plainify(synthesis.closing_paragraph)}</p>
                )}
                {lifeThemes && lifeThemes.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {lifeThemes.slice(0, 6).map((th, i) => (
                      <span key={i} className="font-mono text-mono-sm text-amber/80 bg-amber/10 border border-amber/20 rounded-pill px-3 py-1">{th}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
