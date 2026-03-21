'use client';

import { motion } from 'framer-motion';
import { ScoreBadge } from './ScoreBadge';

interface WeekData {
  week_label: string;
  week_start: string;
  score: number;
  theme: string;
  commentary: string;
  daily_scores?: number[];
  moon_journey?: string[];
  peak_days_count?: number;
  caution_days_count?: number;
}

interface WeeklyAnalysisProps {
  weeks: WeekData[];
}

const MOON_SIGN_ABBREVIATIONS: Record<string, string> = {
  Aries: 'Ari', Taurus: 'Tau', Gemini: 'Gem', Cancer: 'Can',
  Leo: 'Leo', Virgo: 'Vir', Libra: 'Lib', Scorpio: 'Sco',
  Sagittarius: 'Sag', Capricorn: 'Cap', Aquarius: 'Aqu', Pisces: 'Pis',
};

const WEEK_FALLBACK: WeekData = {
  week_label: '',
  week_start: '',
  score: 65,
  theme: 'Weekly energy arc.',
  commentary: 'Weekly overview will be available when the forecast is generated.',
  daily_scores: [65, 65, 65, 65, 65, 65, 65],
  moon_journey: [],
  peak_days_count: 0,
  caution_days_count: 0,
};

export function WeeklyAnalysis({ weeks }: WeeklyAnalysisProps) {
  // eslint-disable-next-line no-console
  console.log('[WEEKLY] weeks:', weeks?.length ?? 0);

  const weeksData = Array.from({ length: 6 }, (_, i) => {
    const w = (weeks ?? [])[i];
    const base = w ? { ...WEEK_FALLBACK, ...w } : { ...WEEK_FALLBACK };
    return {
      ...base,
      week_label: (base.week_label ?? '').trim() || `Week ${i + 1} of 6`,
      theme: (base.theme ?? '').trim() || 'Weekly energy arc.',
      commentary: (base.commentary ?? '').trim() || 'Weekly overview will be available when the forecast is generated.',
    };
  });
  const getColor = (score: number) => {
    if (score >= 75) return 'bg-emerald';
    if (score >= 55) return 'bg-amber';
    if (score >= 45) return 'bg-amber/60';
    return 'bg-crimson/80';
  };

  const getBarBg = (score: number) => {
    if (score >= 75) return { backgroundColor: '#10b981' };
    if (score >= 55) return { backgroundColor: '#f59e0b' };
    if (score >= 45) return { backgroundColor: 'rgba(245,158,11,0.5)' };
    return { backgroundColor: '#ef4444' };
  };

  if (!weeks || weeks.length === 0) {
    return (
      <motion.div
        id="weekly"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="space-y-4 mb-12"
      >
        <h2 className="font-display font-semibold text-star text-3xl">
          Weekly Breakdown
        </h2>
        <p className="font-mono text-xs text-dust">
          Weekly data unavailable.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      id="weekly"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="space-y-6 mb-12"
    >
      <h2 className="font-display font-semibold text-star text-3xl">
        Weekly Breakdown
      </h2>

      <div className="grid md:grid-cols-2 gap-6">
        {weeksData.map((week, i) => {
          const peakCount = week.peak_days_count ?? (week.daily_scores?.filter(s => s >= 75).length ?? 0);
          const cautionCount = week.caution_days_count ?? (week.daily_scores?.filter(s => s < 50).length ?? 0);

          // Deduplicate moon_journey signs to show progression
          const moonJourney = week.moon_journey ?? [];
          const uniqueMoonSigns = moonJourney.filter((sign, idx) => sign !== moonJourney[idx - 1]);

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -2, borderColor: 'rgba(245, 158, 11, 0.4)' }}
              className="bg-cosmos border border-horizon rounded-sm p-6 transition-all"
            >
              {/* Week arc header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-mono text-xs text-dust tracking-wider uppercase">
                    {week.week_label}
                  </p>
                  {(peakCount > 0 || cautionCount > 0) && (
                    <p className="font-mono text-[10px] text-dust/50 mt-0.5">
                      {peakCount > 0 && <span className="text-emerald">★ {peakCount} peak</span>}
                      {peakCount > 0 && cautionCount > 0 && <span className="text-dust/30"> · </span>}
                      {cautionCount > 0 && <span className="text-crimson">⚠ {cautionCount} caution</span>}
                    </p>
                  )}
                </div>
              </div>

              {/* Score */}
              <div className="mb-4">
                <ScoreBadge score={week.score} size="lg" />
              </div>

              {/* Moon journey pills */}
              {uniqueMoonSigns.length > 0 && (
                <div className="flex items-center gap-1 mb-3 flex-wrap">
                  <span className="font-mono text-[9px] text-dust/40 uppercase tracking-wider mr-1">Moon:</span>
                  {uniqueMoonSigns.map((sign, j) => (
                    <span key={j} className="flex items-center gap-1">
                      {j > 0 && <span className="text-dust/30 text-[10px]">→</span>}
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm border border-horizon/50 text-amber/80 bg-amber/5">
                        {MOON_SIGN_ABBREVIATIONS[sign] ?? sign.slice(0, 3)}
                      </span>
                    </span>
                  ))}
                </div>
              )}

              {/* Theme */}
              <p className="font-display italic text-amber text-base mb-3">
                {week.theme}
              </p>

              {/* Commentary */}
              <p className="font-display text-star text-sm leading-[1.8] mb-4">
                {week.commentary}
              </p>

              {/* Daily sparkline */}
              {(week.daily_scores?.length ?? 0) > 0 && (
                <div className="pt-4 border-t border-horizon/40">
                  <div className="flex items-end gap-1 h-16">
                    {(week.daily_scores ?? []).map((score, j) => (
                      <div
                        key={j}
                        className="flex-1 rounded-t-sm min-h-[4px]"
                        style={{ height: `${Math.max(8, score)}%`, ...getBarBg(score) }}
                        title={`Day ${j + 1}: ${score}`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between mt-1 font-mono text-[9px] text-dust">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].slice(0, week.daily_scores?.length ?? 7).map((d, j) => (
                      <span key={j} className="flex-1 text-center">{d}</span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
