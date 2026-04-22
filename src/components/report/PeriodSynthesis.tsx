'use client';

import { motion } from 'framer-motion';

interface SynthesisStructured {
  opening_paragraph?: string;
  strategic_windows?: Array<{ date: string; nakshatra: string; score: number; reason: string }>;
  caution_dates?: Array<{ date: string; nakshatra: string; score: number; reason: string }>;
  domain_priorities?: { career?: string; money?: string; health?: string; relationships?: string };
  closing_paragraph?: string;
}

interface PeriodSynthesisProps {
  synthesis: string | SynthesisStructured;
  dailyScores: Array<{ date: string; score: number }>;
  onDayClick?: (index: number) => void;
}

export function PeriodSynthesis({ synthesis, dailyScores, onDayClick }: PeriodSynthesisProps) {
  if (!synthesis) {
    return (
      <div id="synthesis" className="p-8 text-center">
        <p className="text-amber text-lg">
          Synthesis generating...
        </p>
      </div>
    );
  }

  const getColor = (score: number) => {
    if (score >= 75) return 'bg-success/25';
    if (score >= 65) return 'bg-success/10';
    if (score >= 55) return 'bg-amber/15';
    if (score >= 45) return 'bg-amber/10 border-amber/20';
    return 'bg-caution/20';
  };

  const getScoreColor = (score: number) => {
    if (score >= 65) return 'text-success';
    if (score >= 45) return 'text-amber';
    return 'text-caution';
  };

  const getScorePrefix = (score: number) => {
    if (score >= 85) return '★★★ ';
    if (score >= 75) return '★ ';
    if (score < 45) return '⚠ ';
    return '';
  };

  const isStructured = typeof synthesis === 'object' && synthesis !== null && synthesis !== undefined;
  const s = synthesis as SynthesisStructured;
  const OPENING_FALLBACK = 'This forecast period holds clear patterns for your career, relationships, finances, and wellbeing. Use the highest-scoring daily windows for important decisions and actions — and avoid starting anything new during Rahu Kaal.';
  const CLOSING_FALLBACK = 'Align your key moves with your highest-scoring days and best hourly windows. Small timing adjustments compound into meaningful results over the forecast period.';
  const DOMAIN_FALLBACK: Record<string, string> = {
    career: 'Use your highest-scoring days and Mars hora windows for bold career moves, proposals, and important conversations. Avoid low-score days for irreversible decisions.',
    money: 'Best financial timing falls on high-score days — align larger decisions with your peak windows. Avoid new financial commitments during Rahu Kaal or low-score periods.',
    health: 'Rest and recovery are most effective on low-score days. Protect your energy during the most demanding stretches and prioritise consistent routines over bursts of effort.',
    relationships: 'Important conversations land best on high-score days with favourable hourly windows. Avoid pressing sensitive topics during low-score periods or Rahu Kaal.',
  };

  return (
    <motion.div
      id="synthesis"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="bg-cosmos border border-horizon rounded-sm p-8"
    >
      <h3 className="font-display font-semibold text-star text-3xl mb-6">
        Period Synthesis
      </h3>

      {isStructured ? (
        <div className="space-y-1 mb-8">
          <p className="font-display text-star text-base leading-[1.8]">
            {(s?.opening_paragraph ?? '').trim() || OPENING_FALLBACK}
          </p>
          <div className="pt-6">
            <p className="font-mono text-mono-sm text-amber tracking-[0.15em] uppercase mb-3">
              Strategic Windows
            </p>
            <ul className="space-y-2">
              {(s?.strategic_windows ?? []).length > 0 ? (s?.strategic_windows ?? []).map((w, i) => (
                <li key={i} className="font-display text-star text-body-sm leading-[1.7]">
                  <span className="font-mono text-mono-sm text-success">{w.date}</span>
                  {w.nakshatra != null && (
                    <span className="font-mono text-mono-sm text-dust ml-2">({w.nakshatra}, {w.score})</span>
                  )}
                  — {w.reason || 'Favourable timing.'}
                </li>
              )) : (
                <li className="font-display text-star text-body-sm leading-[1.7] text-dust/70">
                  Use the daily score calendar to identify high-score windows.
                </li>
              )}
            </ul>
          </div>
          <div className="pt-4">
            <p className="font-mono text-mono-sm text-caution/80 tracking-[0.15em] uppercase mb-3">
              Caution Dates
            </p>
            <ul className="space-y-2">
              {(s?.caution_dates ?? []).length > 0 ? (s?.caution_dates ?? []).map((c, i) => (
                <li key={i} className="font-display text-star text-body-sm leading-[1.7]">
                  <span className="font-mono text-mono-sm text-caution">{c.date}</span>
                  {c.nakshatra != null && (
                    <span className="font-mono text-mono-sm text-dust ml-2">({c.nakshatra}, {c.score})</span>
                  )}
                  — {c.reason || 'Exercise caution.'}
                </li>
              )) : (
                <li className="font-display text-star text-body-sm leading-[1.7] text-dust/70">
                  Check the daily score calendar for lower-scoring days.
                </li>
              )}
            </ul>
          </div>
          <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {(['career', 'money', 'health', 'relationships'] as const).map((key) => (
              <div key={key} className="py-2 px-3 rounded-sm bg-cosmos border border-horizon/60">
                <p className="font-mono text-mono-sm text-dust uppercase mb-1">{key}</p>
                <p className="font-display text-star text-body-sm leading-[1.6]">
                  {(s?.domain_priorities?.[key] ?? '').trim() || DOMAIN_FALLBACK[key]}
                </p>
              </div>
            ))}
          </div>
          <p className="font-display text-star text-base leading-[1.8] pt-6 italic">
            {(s?.closing_paragraph ?? '').trim() || CLOSING_FALLBACK}
          </p>
        </div>
      ) : (
        <p className="font-display text-star text-base leading-[1.8] mb-8">
          {(typeof synthesis === 'string' ? synthesis : '').trim() || OPENING_FALLBACK}
        </p>
      )}

      {/* Score calendar */}
      <div className="pt-6 border-t border-horizon/40">
        <p className="font-mono text-mono-sm text-dust tracking-[0.15em] uppercase mb-4">
          Daily Score Calendar
        </p>
        <div className="flex flex-wrap gap-2">
          {(dailyScores ?? []).map((day, i) => (
            <button
              key={day?.date ?? i}
              onClick={() => onDayClick?.(i)}
              className={`w-12 h-12 rounded-sm ${getColor(day?.score ?? 50)} border border-horizon/40 hover:border-amber/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/60 transition-all flex flex-col items-center justify-center gap-0.5`}
              title={`${day?.date ?? ''}: ${day?.score ?? 50}`}
              aria-label={`Go to ${day?.date ?? `day ${i + 1}`} — score ${day?.score ?? 50}`}
            >
              <span className={`font-mono text-[11px] font-bold ${getScoreColor(day?.score ?? 50)}`}>
                {getScorePrefix(day?.score ?? 50)}{day?.score ?? 50}
              </span>
              {day?.date && (
                <span className="font-mono text-[8px] text-dust/40">
                  {new Date(day.date + 'T12:00:00').toLocaleDateString('en', { month: 'numeric', day: 'numeric' })}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
