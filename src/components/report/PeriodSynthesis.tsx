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
  const getColor = (score: number) => {
    if (score >= 70) return 'bg-emerald/30';
    if (score >= 50) return 'bg-amber/30';
    return 'bg-crimson/30';
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald';
    if (score >= 50) return 'text-amber';
    return 'text-crimson';
  };

  const isStructured = typeof synthesis === 'object' && synthesis !== null && synthesis !== undefined;

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
          {(synthesis as SynthesisStructured).opening_paragraph && (
            <p className="font-display text-star text-base leading-[1.8]">
              {(synthesis as SynthesisStructured).opening_paragraph}
            </p>
          )}
          {(synthesis as SynthesisStructured).strategic_windows &&
            (synthesis as SynthesisStructured).strategic_windows!.length > 0 && (
              <div className="pt-6">
                <p className="font-mono text-xs text-amber tracking-[0.15em] uppercase mb-3">
                  Strategic Windows
                </p>
                <ul className="space-y-2">
                  {((synthesis as SynthesisStructured).strategic_windows ?? []).map((w, i) => (
                    <li key={i} className="font-display text-star text-sm leading-[1.7]">
                      <span className="font-mono text-xs text-emerald">{w.date}</span>
                      {w.nakshatra && (
                        <span className="font-mono text-xs text-dust ml-2">({w.nakshatra}, {w.score})</span>
                      )}
                      — {w.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          {(synthesis as SynthesisStructured).caution_dates &&
            (synthesis as SynthesisStructured).caution_dates!.length > 0 && (
              <div className="pt-4">
                <p className="font-mono text-xs text-crimson/80 tracking-[0.15em] uppercase mb-3">
                  Caution Dates
                </p>
                <ul className="space-y-2">
                  {((synthesis as SynthesisStructured).caution_dates ?? []).map((c, i) => (
                    <li key={i} className="font-display text-star text-sm leading-[1.7]">
                      <span className="font-mono text-xs text-crimson">{c.date}</span>
                      {c.nakshatra && (
                        <span className="font-mono text-xs text-dust ml-2">({c.nakshatra}, {c.score})</span>
                      )}
                      — {c.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          {(synthesis as SynthesisStructured).domain_priorities && (
            <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {(['career', 'money', 'health', 'relationships'] as const).map((key) => {
                const text = (synthesis as SynthesisStructured).domain_priorities?.[key];
                if (!text) return null;
                return (
                  <div key={key} className="py-2 px-3 rounded-sm bg-cosmos border border-horizon/60">
                    <p className="font-mono text-xs text-dust uppercase mb-1">{key}</p>
                    <p className="font-display text-star text-sm leading-[1.6]">{text}</p>
                  </div>
                );
              })}
            </div>
          )}
          {(synthesis as SynthesisStructured).closing_paragraph && (
            <p className="font-display text-star text-base leading-[1.8] pt-6 italic">
              {(synthesis as SynthesisStructured).closing_paragraph}
            </p>
          )}
        </div>
      ) : (
        <p className="font-display text-star text-base leading-[1.8] mb-8">
          {typeof synthesis === 'string' ? synthesis : ''}
        </p>
      )}

      {/* Score calendar */}
      <div className="pt-6 border-t border-horizon/40">
        <p className="font-mono text-xs text-dust tracking-[0.15em] uppercase mb-4">
          Daily Score Calendar
        </p>
        <div className="flex flex-wrap gap-2">
          {(dailyScores ?? []).map((day, i) => (
            <button
              key={day?.date ?? i}
              onClick={() => onDayClick?.(i)}
              className={`w-10 h-10 rounded-sm ${getColor(day?.score ?? 50)} border border-horizon hover:border-amber/40 transition-all flex items-center justify-center`}
              title={`${day?.date ?? ''}: ${day?.score ?? 50}`}
            >
              <span className={`font-mono text-xs font-medium ${getScoreColor(day?.score ?? 50)}`}>
                {day?.score ?? 50}
              </span>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
