'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HourlyAnalysis } from './HourlyAnalysis';
import { formatDayOutcomeLabel } from '@/lib/guidance/labels';
import type { SlotGuidanceV2, DayBriefingV2 } from '@/lib/guidance/types';

interface HourSlot {
  time: string;
  end_time: string;
  score: number;
  hora_planet: string;
  hora_planet_symbol?: string;
  choghadiya: string;
  choghadiya_quality?: string;
  is_rahu_kaal: boolean;
  commentary?: string;
  transit_lagna?: string;
  transit_lagna_house?: number;
  display_label?: string;
  slot_index?: number;
  guidance_v2?: SlotGuidanceV2;
}

interface DayData {
  date: string;
  day_score: number;
  day_theme?: string;
  day_rating_label?: string;
  panchang?: {
    tithi?: string;
    nakshatra?: string;
    yoga?: string;
    karana?: string;
    moon_sign?: string;
  };
  day_overview?: string;
  rahu_kaal?: { start: string; end: string } | null;
  best_windows?: Array<{
    time: string;
    hora: string;
    choghadiya: string;
    score: number;
    reason?: string;
    display_label?: string;
  }>;
  avoid_windows?: Array<{
    time: string;
    reason: string;
  }>;
  peak_count?: number;
  caution_count?: number;
  hours?: HourSlot[] | null;
  hourlySlots?: HourSlot[];
  slots?: HourSlot[];
  briefing_v2?: DayBriefingV2;
}

interface DailyAnalysisProps {
  days: DayData[];
  activeDayIndex?: number;
  onDayChange?: (index: number) => void;
  lagna?: string;
}

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mars: '♂', Mercury: '☿',
  Jupiter: '♃', Venus: '♀', Saturn: '♄',
};

export function DailyAnalysis({ days, activeDayIndex = 0, onDayChange, lagna }: DailyAnalysisProps) {
  const [internalActive, setInternalActive] = useState(0);
  const selectedDay = onDayChange ? activeDayIndex : internalActive;
  const setSelectedDay = onDayChange ? onDayChange : setInternalActive;

  const formatTabLabel = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      if (isNaN(d.getTime())) return dateStr || '?';
      const names = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      return `${names[d.getDay()]}\n${d.getDate()}`;
    } catch {
      return dateStr || '?';
    }
  };

  const currentDay = days[selectedDay] ?? days[0];

  const slotsForSummary = useMemo((): HourSlot[] => {
    if (!currentDay) return [];
    const hourlyData: HourSlot[] = currentDay.hours ?? currentDay.hourlySlots ?? [];
    return (currentDay.slots ?? hourlyData ?? []) as HourSlot[];
  }, [currentDay]);

  const playbook = useMemo(() => {
    if (!currentDay) {
      return {
        peak: undefined as HourSlot | undefined,
        second: undefined as HourSlot | undefined,
        rk: null as DayData['rahu_kaal'],
        theme: 'Use hourly scores to sequence work and rest.',
      };
    }
    const list = slotsForSummary.filter(Boolean);
    const nonRk = list.filter((s) => !s?.is_rahu_kaal);
    const sorted = [...nonRk].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const peak = sorted[0];
    const second = sorted[1];
    const rk = currentDay.rahu_kaal;
    const theme =
      (currentDay.day_theme ?? '').trim() ||
      [currentDay.panchang?.yoga, currentDay.panchang?.nakshatra].filter(Boolean).join(' · ') ||
      'Use hourly scores to sequence work and rest.';
    return { peak, second, rk, theme };
  }, [currentDay, slotsForSummary]);

  if (!currentDay) return null;

  const score = currentDay.day_score ?? 50;
  const scoreColor = score >= 65 ? 'text-emerald' : score >= 45 ? 'text-amber' : 'text-crimson';

  const peakCount =
    currentDay.peak_count ??
    (slotsForSummary as HourSlot[]).filter((s) => s?.score >= 75).length ??
    currentDay.best_windows?.length ??
    0;
  const cautionCount =
    currentDay.caution_count ??
    (slotsForSummary as HourSlot[]).filter((s) => s?.score <= 45).length ??
    0;
  const peakWindows = (slotsForSummary as HourSlot[])
    .filter((s) => s?.score >= 75 && s.display_label)
    .map((s) => s.display_label as string)
    .join(' · ');
  const avgScore = score;

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

      {/* Tab strip — one tab per day */}
      <div className="overflow-x-auto scrollbar-thin">
        <div className="flex gap-2 min-w-max pb-2">
          {(days ?? []).map((day, i) => (
            <button
              key={day?.date || i}
              onClick={() => setSelectedDay(i)}
              aria-selected={selectedDay === i}
              aria-label={`${day?.date ?? ''} forecast`}
              role="tab"
              className={`px-4 py-3 rounded-sm font-mono uppercase tracking-wider transition-all whitespace-pre-line leading-tight min-h-[44px] ${
                selectedDay === i
                  ? 'border-b-2 border-amber text-star bg-nebula/40 text-sm'
                  : 'text-dust hover:text-star text-xs'
              }`}
            >
              {formatTabLabel(day?.date ?? '')}
            </button>
          ))}
        </div>
      </div>

      {/* Active day content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedDay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-cosmos border border-horizon rounded-sm p-8"
        >
          {/* Score + peaks header */}
          <div className="flex flex-col items-start gap-2 mb-6">
            <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
              <span className={`font-display font-semibold text-4xl sm:text-5xl ${scoreColor}`}>
                {score}
              </span>
              <span className="text-lg sm:text-xl text-dust">/100</span>
              <span className="text-base sm:text-lg font-semibold ml-1 sm:ml-2 text-dust">
                {formatDayOutcomeLabel(score)}
              </span>
              <span className="ml-auto font-mono text-xs text-dust/70">
                {peakCount > 0 && (
                  <span className="text-emerald mr-2">
                    ★ {peakCount} peak{peakCount === 1 ? '' : 's'}
                  </span>
                )}
                {cautionCount > 0 && (
                  <span className="text-crimson">
                    ⚠ {cautionCount} caution
                  </span>
                )}
                {!peakCount && !cautionCount && (
                  <span className="text-dust/60">avg {avgScore}/100</span>
                )}
              </span>
            </div>
            {peakWindows && (
              <p className="text-sm text-amber">
                Peak windows: {peakWindows}
              </p>
            )}
          </div>

          {/* Today's Playbook — top slots + Rahu Kaal + theme */}
          <div className="mb-8 rounded-sm border border-amber/25 bg-nebula/20 p-5 max-w-3xl mx-auto">
            <p className="font-mono text-xs text-amber tracking-[0.2em] uppercase mb-3">
              Today&apos;s Playbook
            </p>
            <div className="space-y-3 font-mono text-sm text-star">
              {playbook.peak && (
                <p>
                  <span className="text-emerald">Peak</span> · {playbook.peak.display_label ?? '—'} (score{' '}
                  {playbook.peak.score ?? '—'}) — {(playbook.peak as HourSlot).hora_planet || '—'} hora ·{' '}
                  {(playbook.peak as HourSlot).choghadiya || '—'}
                </p>
              )}
              {playbook.second && (
                <p>
                  <span className="text-amber">Second</span> · {playbook.second.display_label ?? '—'} (score{' '}
                  {playbook.second.score ?? '—'}) — {(playbook.second as HourSlot).hora_planet || '—'} hora ·{' '}
                  {(playbook.second as HourSlot).choghadiya || '—'}
                </p>
              )}
              {playbook.rk && (playbook.rk.start || playbook.rk.end) && (
                <p className="text-crimson">
                  Rahu Kaal · {playbook.rk.start ?? '—'}–{playbook.rk.end ?? '—'} — keep to routine tasks only.
                </p>
              )}
              <p className="text-dust text-xs leading-relaxed border-t border-horizon/40 pt-3">
                Today&apos;s theme: {playbook.theme}
              </p>
            </div>
          </div>

          {/* Panchang */}
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
          {currentDay.day_theme && (
            <p className="font-display italic text-amber text-xl text-center mb-6">
              {currentDay.day_theme}
            </p>
          )}

          {/* V2 Day Briefing — decision-support first */}
          {currentDay.briefing_v2 && (
            <div className="bg-nebula/20 border border-horizon rounded-sm p-5 mb-6 max-w-2xl mx-auto space-y-3">
              {currentDay.briefing_v2.best_overall_for.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-emerald tracking-wider uppercase">Best for:</span>
                  {currentDay.briefing_v2.best_overall_for.map((b, i) => (
                    <span key={i} className="px-2 py-1 rounded-sm bg-emerald/10 border border-emerald/20 font-mono text-xs text-emerald">{b}</span>
                  ))}
                </div>
              )}
              {currentDay.briefing_v2.not_ideal_for.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-crimson/70 tracking-wider uppercase">Less ideal:</span>
                  {currentDay.briefing_v2.not_ideal_for.map((n, i) => (
                    <span key={i} className="px-2 py-1 rounded-sm bg-crimson/10 border border-crimson/20 font-mono text-xs text-crimson">{n}</span>
                  ))}
                </div>
              )}
              <p className="font-mono text-xs text-dust leading-relaxed">
                {currentDay.briefing_v2.why_today}
              </p>
            </div>
          )}

          {/* Day overview */}
          <p className="font-display text-star text-base leading-[1.8] text-center max-w-2xl mx-auto mb-8 whitespace-pre-line">
            {currentDay.day_overview || 'Overview unavailable'}
          </p>

          {/* Quick windows */}
          <div className="space-y-4">
            {currentDay.best_windows && currentDay.best_windows.length > 0 && (
              <div>
                <p className="font-mono text-xs text-dust tracking-[0.15em] uppercase mb-3 text-center">
                  Optimal Windows
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {currentDay.best_windows.map((w, i) => {
                    const fmtLabel = (s: string): string => {
                      if (!s) return '';
                      if (s.includes('-') && s.length <= 11) return s;
                      return s.split(/[-\u2013]/)
                        .map(t => t.trim().split(':').slice(0, 2).join(':'))
                        .join('\u2013');
                    };
                    const timeStr = fmtLabel(w.time ?? w.display_label ?? '');
                    return (
                    <div
                      key={i}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-emerald/10 border border-emerald/20"
                      title={w.reason}
                    >
                      <span className="text-emerald text-sm">
                        {PLANET_SYMBOLS[w.hora] || ''}
                      </span>
                      <span className="font-mono text-xs text-emerald">{timeStr}</span>
                      <span className="text-emerald/50">·</span>
                      <span className="font-mono text-xs text-emerald/70">{w.choghadiya}</span>
                      <span className="text-emerald/50">·</span>
                      <span className="font-mono text-xs text-emerald font-medium">{w.score}</span>
                    </div>
                  ); })}
                </div>
              </div>
            )}

            {currentDay.rahu_kaal && (currentDay.rahu_kaal.start || currentDay.rahu_kaal.end) && (
              <div>
                <p className="font-mono text-xs text-dust tracking-[0.15em] uppercase mb-3 text-center">
                  Rahu Kaal
                </p>
                <div className="flex justify-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-crimson/10 border border-crimson/20">
                    <span className="text-crimson">⚠</span>
                    <span className="font-mono text-xs text-crimson">
                      Rahu Kaal: {(() => {
                        const fmtTime = (t: string): string => {
                          if (!t) return '';
                          if (t.includes('T')) t = t.split('T')[1];
                          return t.slice(0, 5);
                        };
                        return `${fmtTime(currentDay.rahu_kaal?.start ?? '')} - ${fmtTime(currentDay.rahu_kaal?.end ?? '')}`;
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {currentDay.avoid_windows && currentDay.avoid_windows.length > 0 && (
              <div>
                <p className="font-mono text-xs text-dust tracking-[0.15em] uppercase mb-3 text-center">
                  Avoid
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {currentDay.avoid_windows.map((w, i) => (
                    <div
                      key={i}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-crimson/10 border border-crimson/20"
                    >
                      <span className="font-mono text-xs text-crimson">
                        {w.time} · {w.reason}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Hourly analysis for the active day — rendered inline */}
      {hourlyData.length > 0 && (
        <HourlyAnalysis hours={hourlyData} lagna={lagna} />
      )}
    </motion.div>
  );
}
