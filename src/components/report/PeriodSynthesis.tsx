'use client';

import { motion } from 'framer-motion';

interface PeriodSynthesisProps {
  synthesis: string;
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="bg-cosmos border border-horizon rounded-sm p-8"
    >
      <h3 className="font-display font-semibold text-star text-3xl mb-6">
        Period Synthesis
      </h3>
      
      <p className="font-display text-star text-base leading-[1.8] mb-8">
        {synthesis}
      </p>

      {/* Score calendar */}
      <div className="pt-6 border-t border-horizon/40">
        <p className="font-mono text-xs text-dust tracking-[0.15em] uppercase mb-4">
          Daily Score Calendar
        </p>
        <div className="flex flex-wrap gap-2">
          {dailyScores.map((day, i) => (
            <button
              key={i}
              onClick={() => onDayClick?.(i)}
              className={`w-10 h-10 rounded-sm ${getColor(day.score)} border border-horizon hover:border-amber/40 transition-all flex items-center justify-center`}
              title={`${day.date}: ${day.score}`}
            >
              <span className={`font-mono text-xs font-medium ${getScoreColor(day.score)}`}>
                {day.score}
              </span>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
