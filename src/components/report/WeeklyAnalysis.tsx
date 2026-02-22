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
}

interface WeeklyAnalysisProps {
  weeks: WeekData[];
}

export function WeeklyAnalysis({ weeks }: WeeklyAnalysisProps) {
  const getColor = (score: number) => {
    if (score >= 70) return 'bg-emerald';
    if (score >= 50) return 'bg-amber';
    return 'bg-crimson';
  };

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
        {weeks.map((week, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            whileHover={{ y: -2, borderColor: 'rgba(245, 158, 11, 0.4)' }}
            className="bg-cosmos border border-horizon rounded-sm p-6 transition-all"
          >
            {/* Week date range */}
            <p className="font-mono text-xs text-dust tracking-wider uppercase mb-3">
              {week.week_label}
            </p>

            {/* Score */}
            <div className="mb-4">
              <ScoreBadge score={week.score} size="lg" />
            </div>

            {/* Theme */}
            <p className="font-display italic text-amber text-base mb-3">
              {week.theme}
            </p>

            {/* Commentary */}
            <p className="font-display text-star text-sm leading-[1.8] mb-4">
              {week.commentary}
            </p>

            {/* Daily sparkline */}
            {week.daily_scores && week.daily_scores.length > 0 && (
              <div className="pt-4 border-t border-horizon/40">
                <div className="flex items-end gap-1 h-12">
                  {week.daily_scores.map((score, j) => (
                    <div
                      key={j}
                      className={`flex-1 rounded-t-sm ${getColor(score)}`}
                      style={{ height: `${(score / 100) * 100}%` }}
                      title={`Day ${j + 1}: ${score}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
