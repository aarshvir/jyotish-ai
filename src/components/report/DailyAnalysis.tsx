'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScoreBadge } from './ScoreBadge';

interface DayData {
  date: string;
  day_score: number;
  day_theme: string;
  day_rating_label: string;
  panchang?: {
    tithi?: string;
    nakshatra?: string;
    yoga?: string;
    karana?: string;
    moon_sign?: string;
  };
  day_overview: string;
  rahu_kaal?: { start: string; end: string };
  best_windows?: Array<{
    time: string;
    hora: string;
    choghadiya: string;
    score: number;
    reason?: string;
  }>;
  avoid_windows?: Array<{
    time: string;
    reason: string;
  }>;
}

interface DailyAnalysisProps {
  days: DayData[];
}

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉',
  Moon: '☽',
  Mars: '♂',
  Mercury: '☿',
  Jupiter: '♃',
  Venus: '♀',
  Saturn: '♄',
};

export function DailyAnalysis({ days }: DailyAnalysisProps) {
  const [activeDay, setActiveDay] = useState(0);

  const formatTabLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return `${dayNames[date.getDay()]}\n${date.getDate()}`;
  };

  const currentDay = days[activeDay];

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald';
    if (score >= 50) return 'text-amber';
    return 'text-crimson';
  };

  return (
    <motion.div
      id="daily"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="space-y-6 mb-12"
    >
      <h2 className="font-display font-semibold text-star text-3xl">
        Daily Forecast
      </h2>

      {/* Tab navigator */}
      <div className="overflow-x-auto scrollbar-thin">
        <div className="flex gap-2 min-w-max pb-2">
          {days.map((day, i) => (
            <button
              key={i}
              onClick={() => setActiveDay(i)}
              className={`px-4 py-3 rounded-sm font-mono text-xs uppercase tracking-wider transition-all whitespace-pre-line leading-tight ${
                activeDay === i
                  ? 'border-b-2 border-amber text-star bg-nebula/40'
                  : 'text-dust hover:text-star'
              }`}
            >
              {formatTabLabel(day.date)}
            </button>
          ))}
        </div>
      </div>

      {/* Day content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeDay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-cosmos border border-horizon rounded-sm p-8"
        >
          {/* Score display */}
          <div className="text-center mb-8">
            <div className={`font-display font-semibold text-[96px] leading-none ${getScoreColor(currentDay.day_score)}`}>
              {currentDay.day_score}
            </div>
            <p className={`font-mono text-xs tracking-[0.2em] uppercase mt-3 ${getScoreColor(currentDay.day_score)}`}>
              {currentDay.day_rating_label}
            </p>
          </div>

          {/* Panchang row */}
          {currentDay.panchang && (
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {currentDay.panchang.tithi && (
                <span className="px-3 py-1.5 rounded-sm bg-cosmos border border-horizon font-mono text-xs text-dust">
                  Tithi: {currentDay.panchang.tithi}
                </span>
              )}
              {currentDay.panchang.nakshatra && (
                <span className="px-3 py-1.5 rounded-sm bg-cosmos border border-horizon font-mono text-xs text-dust">
                  Nakshatra: {currentDay.panchang.nakshatra}
                </span>
              )}
              {currentDay.panchang.yoga && (
                <span className="px-3 py-1.5 rounded-sm bg-cosmos border border-horizon font-mono text-xs text-dust">
                  Yoga: {currentDay.panchang.yoga}
                </span>
              )}
              {currentDay.panchang.karana && (
                <span className="px-3 py-1.5 rounded-sm bg-cosmos border border-horizon font-mono text-xs text-dust">
                  Karana: {currentDay.panchang.karana}
                </span>
              )}
              {currentDay.panchang.moon_sign && (
                <span className="px-3 py-1.5 rounded-sm bg-cosmos border border-horizon font-mono text-xs text-dust">
                  Moon: {currentDay.panchang.moon_sign}
                </span>
              )}
            </div>
          )}

          {/* Theme */}
          <p className="font-display italic text-amber text-xl text-center mb-6">
            {currentDay.day_theme}
          </p>

          {/* Day overview */}
          <p className="font-display text-star text-base leading-[1.8] text-center max-w-2xl mx-auto mb-8">
            {currentDay.day_overview}
          </p>

          {/* Quick windows */}
          <div className="space-y-4">
            {/* Best windows */}
            {currentDay.best_windows && currentDay.best_windows.length > 0 && (
              <div>
                <p className="font-mono text-xs text-dust tracking-[0.15em] uppercase mb-3 text-center">
                  Optimal Windows
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {currentDay.best_windows.map((window, i) => (
                    <div
                      key={i}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-emerald/10 border border-emerald/20"
                      title={window.reason}
                    >
                      <span className="text-emerald text-sm">
                        {PLANET_SYMBOLS[window.hora] || ''}
                      </span>
                      <span className="font-mono text-xs text-emerald">
                        {window.time}
                      </span>
                      <span className="text-emerald/50">·</span>
                      <span className="font-mono text-xs text-emerald/70">
                        {window.choghadiya}
                      </span>
                      <span className="text-emerald/50">·</span>
                      <span className="font-mono text-xs text-emerald font-medium">
                        {window.score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rahu Kaal */}
            {currentDay.rahu_kaal && (
              <div>
                <p className="font-mono text-xs text-dust tracking-[0.15em] uppercase mb-3 text-center">
                  Rahu Kaal
                </p>
                <div className="flex justify-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-crimson/10 border border-crimson/20">
                    <span className="text-crimson">⚠</span>
                    <span className="font-mono text-xs text-crimson">
                      {currentDay.rahu_kaal.start}–{currentDay.rahu_kaal.end}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Avoid windows */}
            {currentDay.avoid_windows && currentDay.avoid_windows.length > 0 && (
              <div>
                <p className="font-mono text-xs text-dust tracking-[0.15em] uppercase mb-3 text-center">
                  Avoid
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {currentDay.avoid_windows.map((window, i) => (
                    <div
                      key={i}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-crimson/10 border border-crimson/20"
                    >
                      <span className="font-mono text-xs text-crimson">
                        {window.time} · {window.reason}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
