'use client';

import { motion } from 'framer-motion';
import { ScoreBadge } from './ScoreBadge';

interface MonthData {
  month: string;
  score: number;
  overall_score: number;
  career_score?: number;
  money_score?: number;
  health_score?: number;
  love_score?: number;
  theme: string;
  key_transits?: string[];
  commentary: string;
  weekly_scores?: number[];
}

interface MonthlyAnalysisProps {
  months: MonthData[];
}

export function MonthlyAnalysis({ months }: MonthlyAnalysisProps) {
  const getColor = (score: number) => {
    if (score >= 70) return 'bg-emerald';
    if (score >= 50) return 'bg-amber';
    return 'bg-crimson';
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald';
    if (score >= 50) return 'text-amber';
    return 'text-crimson';
  };

  return (
    <motion.div
      id="monthly"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="space-y-6 mb-12"
    >
      <h2 className="font-display font-semibold text-star text-3xl">
        Monthly Overview
      </h2>

      <div className="space-y-6">
        {months.map((month, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            whileHover={{ y: -2, borderColor: 'rgba(245, 158, 11, 0.4)' }}
            className="bg-cosmos border border-horizon rounded-sm p-8 transition-all"
          >
            {/* Top row: month name + score */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-display font-semibold text-star text-2xl mb-2">
                  {month.month}
                </h3>
                <p className="font-mono text-xs text-dust tracking-wider uppercase">
                  Overall Quality
                </p>
              </div>
              <div className="text-right">
                <div className={`font-display font-semibold text-5xl ${getScoreColor(month.overall_score)}`}>
                  {month.overall_score}
                </div>
                <p className={`font-mono text-xs tracking-[0.15em] uppercase mt-1 ${getScoreColor(month.overall_score)}`}>
                  {month.overall_score >= 70 ? 'EXCELLENT' : month.overall_score >= 50 ? 'GOOD' : 'CHALLENGING'}
                </p>
              </div>
            </div>

            {/* Theme */}
            <p className="font-display italic text-amber text-lg mb-4">
              {month.theme}
            </p>

            {/* Key transits */}
            {month.key_transits && month.key_transits.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {month.key_transits.map((transit, j) => (
                  <span
                    key={j}
                    className="inline-flex items-center px-3 py-1 rounded-sm bg-cosmos border border-horizon text-xs font-mono text-dust"
                  >
                    {transit}
                  </span>
                ))}
              </div>
            )}

            {/* Multi-domain scores */}
            {(month.career_score || month.money_score || month.health_score || month.love_score) && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="text-center">
                  <p className="font-mono text-[10px] text-dust tracking-wider uppercase mb-1">
                    Overall
                  </p>
                  <p className={`font-mono text-xl font-bold ${getScoreColor(month.overall_score)}`}>
                    {month.overall_score}
                  </p>
                </div>
                {month.career_score && (
                  <div className="text-center">
                    <p className="font-mono text-[10px] text-dust tracking-wider uppercase mb-1">
                      Career
                    </p>
                    <p className={`font-mono text-xl font-bold ${getScoreColor(month.career_score)}`}>
                      {month.career_score}
                    </p>
                  </div>
                )}
                {month.money_score && (
                  <div className="text-center">
                    <p className="font-mono text-[10px] text-dust tracking-wider uppercase mb-1">
                      Money
                    </p>
                    <p className={`font-mono text-xl font-bold ${getScoreColor(month.money_score)}`}>
                      {month.money_score}
                    </p>
                  </div>
                )}
                {month.health_score && (
                  <div className="text-center">
                    <p className="font-mono text-[10px] text-dust tracking-wider uppercase mb-1">
                      Health
                    </p>
                    <p className={`font-mono text-xl font-bold ${getScoreColor(month.health_score)}`}>
                      {month.health_score}
                    </p>
                  </div>
                )}
                {month.love_score && (
                  <div className="text-center">
                    <p className="font-mono text-[10px] text-dust tracking-wider uppercase mb-1">
                      Love
                    </p>
                    <p className={`font-mono text-xl font-bold ${getScoreColor(month.love_score)}`}>
                      {month.love_score}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Commentary */}
            <p className="font-display text-star text-base leading-[1.8] mb-6">
              {month.commentary}
            </p>

            {/* Week score bar */}
            {month.weekly_scores && month.weekly_scores.length > 0 && (
              <div className="pt-6 border-t border-horizon/40">
                <p className="font-mono text-xs text-dust tracking-wider uppercase mb-3">
                  Weekly Breakdown
                </p>
                <div className="flex gap-2">
                  {month.weekly_scores.map((score, j) => (
                    <div key={j} className="flex-1">
                      <div
                        className={`h-2 rounded-full ${getColor(score)}`}
                        title={`Week ${j + 1}: ${score}`}
                      />
                      <p className="font-mono text-[9px] text-dust text-center mt-1">
                        W{j + 1}
                      </p>
                    </div>
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
