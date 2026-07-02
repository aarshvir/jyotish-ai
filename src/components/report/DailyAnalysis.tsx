'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HourlyAnalysis } from './HourlyAnalysis';
import { formatDayOutcomeLabel } from '@/lib/guidance/labels';
import type { SlotGuidanceV2, DayBriefingV2 } from '@/lib/guidance/types';
import { plainify, choghadiyaLabel, PANCHANG_FIELD_LABELS, stripTemplateSections, isDevFallback } from '@/lib/utils/plainify';

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
  /** false = deterministic guidance only (bounded window) — AI prose loads on open. */
  ai_prose?: boolean;
}

interface DailyAnalysisProps {
  days: DayData[];
  activeDayIndex?: number;
  onDayChange?: (index: number) => void;
  lagna?: string;
  /** Enables on-demand hourly prose for far-window days (paid reports). */
  reportId?: string;
}

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mars: '♂', Mercury: '☿',
  Jupiter: '♃', Venus: '♀', Saturn: '♄',
};

export function DailyAnalysis({ days, activeDayIndex = 0, onDayChange, lagna, reportId }: DailyAnalysisProps) {
  const [internalActive, setInternalActive] = useState(0);
  const [showPanchang, setShowPanchang] = useState(false);
  const selectedDay = onDayChange ? activeDayIndex : internalActive;
  const setSelectedDay = onDayChange ? onDayChange : setInternalActive;

  // On-demand hourly prose (bounded-window report-gen): far-window days ship with
  // deterministic guidance and get their AI commentary written the first time the
  // user opens them. Keyed by date; commentary merged over slots by slot_index.
  const [dayProse, setDayProse] = useState<Record<string, Record<number, string>>>({});
  const [proseLoading, setProseLoading] = useState(false);
  const [proseError, setProseError] = useState<string | null>(null);
  const [proseRetryTick, setProseRetryTick] = useState(0);
  const proseAttempted = useRef<Set<string>>(new Set());

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
      plainify([currentDay.panchang?.yoga, currentDay.panchang?.nakshatra].filter(Boolean).join(' · ')) ||
      'Use hourly scores to sequence work and rest.';
    return { peak, second, rk, theme };
  }, [currentDay, slotsForSummary]);

  // Fetch AI prose for the selected day when it shipped without it (ai_prose===false).
  // One attempt per date (retry button bumps proseRetryTick to re-arm).
  const currentDate = currentDay?.date ?? '';
  const currentNeedsProse =
    Boolean(reportId) && currentDay?.ai_prose === false && !dayProse[currentDate];
  useEffect(() => {
    if (!reportId || !currentDate || !currentNeedsProse) return;
    if (proseAttempted.current.has(currentDate)) return;
    proseAttempted.current.add(currentDate);
    let cancelled = false;
    (async () => {
      setProseLoading(true);
      setProseError(null);
      try {
        const res = await fetch(`/api/reports/${reportId}/hourly-day`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: currentDate }),
        });
        const j = (await res.json().catch(() => ({}))) as {
          error?: string;
          slots?: Array<{ slot_index?: number; commentary?: string }>;
        };
        if (cancelled) return;
        if (!res.ok) {
          setProseError(j.error ?? 'Could not write this day yet.');
          return;
        }
        const map: Record<number, string> = {};
        (j.slots ?? []).forEach((s) => {
          if (typeof s.slot_index === 'number' && s.commentary?.trim()) map[s.slot_index] = s.commentary;
        });
        setDayProse((p) => ({ ...p, [currentDate]: map }));
      } catch {
        if (!cancelled) setProseError('Network hiccup — tap retry.');
      } finally {
        if (!cancelled) setProseLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId, currentDate, currentNeedsProse, proseRetryTick]);

  // Hourly slots for the active day, with any on-demand prose merged in.
  const hourlyData: HourSlot[] = useMemo(() => {
    const base = currentDay?.hours ?? currentDay?.hourlySlots ?? [];
    const prose = dayProse[currentDate];
    if (!prose) return base;
    return base.map((s) =>
      typeof s.slot_index === 'number' && prose[s.slot_index]
        ? { ...s, commentary: prose[s.slot_index] }
        : s,
    );
  }, [currentDay, currentDate, dayProse]);

  if (!currentDay) return null;

  const score = currentDay.day_score ?? 50;
  const scoreColor = score >= 65 ? 'text-success' : score >= 45 ? 'text-amber' : 'text-caution';

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
        Day by Day
      </h2>

      {/* Tab strip — one tab per day */}
      <div className="overflow-x-auto scrollbar-thin">
        <div className="flex gap-2 min-w-max pb-2" role="group" aria-label="Forecast days">
          {(days ?? []).map((day, i) => (
            <button
              key={day?.date || i}
              onClick={() => setSelectedDay(i)}
              aria-pressed={selectedDay === i}
              aria-label={`${day?.date ?? ''} forecast`}
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
              <span className="ml-auto font-mono text-mono-sm text-dust/70">
                {peakCount > 0 && (
                  <span className="text-success mr-2">
                    ★ {peakCount} peak{peakCount === 1 ? '' : 's'}
                  </span>
                )}
                {cautionCount > 0 && (
                  <span className="text-caution">
                    ⚠ {cautionCount} caution
                  </span>
                )}
                {!peakCount && !cautionCount && (
                  <span className="text-dust/60">avg {avgScore}/100</span>
                )}
              </span>
            </div>
            {peakWindows && (
              <p className="text-body-sm text-amber">
                Peak windows: {peakWindows}
              </p>
            )}
          </div>

          {/* Today's Playbook — top slots + Rahu Kaal + theme */}
          <div className="mb-8 rounded-sm border border-amber/25 bg-nebula/20 p-5 max-w-3xl mx-auto">
            <p className="font-mono text-mono-sm text-amber tracking-[0.2em] uppercase mb-3">
              Today&apos;s Playbook
            </p>
            <div className="space-y-3 font-mono text-sm text-star">
              {playbook.peak && (
                <p>
                  <span className="text-success">Best window</span> · {playbook.peak.display_label ?? '—'} (score{' '}
                  {playbook.peak.score ?? '—'}) — {(playbook.peak as HourSlot).hora_planet || '—'} hour ·{' '}
                  <span title={`${(playbook.peak as HourSlot).choghadiya} — Vedic time quality`}>
                    {choghadiyaLabel((playbook.peak as HourSlot).choghadiya)}
                  </span>
                </p>
              )}
              {playbook.second && (
                <p>
                  <span className="text-amber">2nd window</span> · {playbook.second.display_label ?? '—'} (score{' '}
                  {playbook.second.score ?? '—'}) — {(playbook.second as HourSlot).hora_planet || '—'} hour ·{' '}
                  <span title={`${(playbook.second as HourSlot).choghadiya} — Vedic time quality`}>
                    {choghadiyaLabel((playbook.second as HourSlot).choghadiya)}
                  </span>
                </p>
              )}
              {playbook.rk && (playbook.rk.start || playbook.rk.end) && (
                <p className="text-caution">
                  Challenging window · {playbook.rk.start ?? '—'}–{playbook.rk.end ?? '—'} — routine tasks only.
                </p>
              )}
              <p className="text-dust text-xs leading-relaxed border-t border-horizon/40 pt-3">
                Today&apos;s theme: {plainify(playbook.theme)}
              </p>
            </div>
          </div>

          {/* Panchang — collapsed by default (noise for non-practitioners) */}
          {currentDay.panchang && (
            <div className="mb-8">
              <button
                type="button"
                onClick={() => setShowPanchang((v) => !v)}
                className="font-mono text-mono-sm text-dust/50 hover:text-dust/80 transition-colors flex items-center gap-1.5 mx-auto min-h-[36px]"
                aria-expanded={showPanchang}
              >
                <span>{showPanchang ? '▲' : '▼'}</span>
                <span>{showPanchang ? 'Hide almanac details' : 'View almanac details (Moon phase, birth star…)'}</span>
              </button>
              {showPanchang && (
                <div className="flex flex-wrap justify-center gap-2 mt-3">
                  {([
                    ['tithi', currentDay.panchang.tithi],
                    ['nakshatra', currentDay.panchang.nakshatra],
                    ['yoga', currentDay.panchang.yoga],
                    ['moon_sign', currentDay.panchang.moon_sign],
                  ] as [string, string | undefined][]).filter(([, v]) => v).map(([key, val]) => (
                    <span
                      key={key}
                      className="px-3 py-1.5 rounded-sm bg-cosmos border border-horizon font-mono text-mono-sm text-dust cursor-help"
                      title={PANCHANG_FIELD_LABELS[key]?.tooltip}
                    >
                      {PANCHANG_FIELD_LABELS[key]?.label ?? key}: {val}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Theme — plainified */}
          {currentDay.day_theme && (
            <p className="font-display italic text-amber text-xl text-center mb-6">
              {plainify(currentDay.day_theme)}
            </p>
          )}

          {/* V2 Day Briefing — decision-support first */}
          {currentDay.briefing_v2 && (
            <div className="bg-nebula/20 border border-horizon rounded-sm p-5 mb-6 max-w-2xl mx-auto space-y-3">
              {currentDay.briefing_v2.best_overall_for.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-mono-sm text-success tracking-wider uppercase">Best for:</span>
                  {currentDay.briefing_v2.best_overall_for.map((b, i) => (
                    <span key={i} className="px-2 py-1 rounded-sm bg-success/10 border border-success/20 font-mono text-mono-sm text-success">{b}</span>
                  ))}
                </div>
              )}
              {currentDay.briefing_v2.not_ideal_for.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-mono-sm text-caution/70 tracking-wider uppercase">Less ideal:</span>
                  {currentDay.briefing_v2.not_ideal_for.map((n, i) => (
                    <span key={i} className="px-2 py-1 rounded-sm bg-caution/10 border border-caution/20 font-mono text-mono-sm text-caution">{n}</span>
                  ))}
                </div>
              )}
              <p className="font-mono text-mono-sm text-dust leading-relaxed">
                {plainify(currentDay.briefing_v2.why_today)}
              </p>
            </div>
          )}

          {/* Day overview — strip template section headers, apply plain-language guard */}
          {(() => {
            const raw = currentDay.day_overview || '';
            if (!raw || isDevFallback(raw)) return null;
            const clean = plainify(stripTemplateSections(raw));
            if (!clean) return null;
            return (
              <p className="font-display text-star text-base leading-[1.8] text-center max-w-2xl mx-auto mb-8 whitespace-pre-line">
                {clean}
              </p>
            );
          })()}

          {/* Quick windows — today's action guide */}
          {(currentDay.best_windows?.length || currentDay.rahu_kaal || currentDay.avoid_windows?.length) ? (
            <p className="section-eyebrow text-center mb-4">Today&apos;s timing guide</p>
          ) : null}
          <div className="space-y-4">
            {currentDay.best_windows && currentDay.best_windows.length > 0 && (
              <div>
                <p className="font-mono text-mono-sm text-dust tracking-[0.15em] uppercase mb-3 text-center">
                  Best windows
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
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-success/10 border border-success/20"
                      title={w.reason}
                    >
                      <span className="text-success text-sm">
                        {PLANET_SYMBOLS[w.hora] || ''}
                      </span>
                      <span className="font-mono text-mono-sm text-success">{timeStr}</span>
                      <span className="text-success/50">·</span>
                      <span className="font-mono text-mono-sm text-success/70" title={`${w.choghadiya} — Vedic time quality`}>{choghadiyaLabel(w.choghadiya)}</span>
                      <span className="text-success/50">·</span>
                      <span className="font-mono text-mono-sm text-success font-medium">{w.score}</span>
                    </div>
                  ); })}
                </div>
              </div>
            )}

            {currentDay.rahu_kaal && (currentDay.rahu_kaal.start || currentDay.rahu_kaal.end) && (
              <div>
                <p className="font-mono text-mono-sm text-dust tracking-[0.15em] uppercase mb-3 text-center" title="Rahu Kaal — the challenging daily window in Vedic astrology. Avoid new starts during this time.">
                  Challenging window
                </p>
                <div className="flex justify-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-caution/10 border border-caution/20">
                    <span className="text-caution">⚠</span>
                    <span className="font-mono text-mono-sm text-caution">
                      Avoid new starts: {(() => {
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
                <p className="font-mono text-mono-sm text-dust tracking-[0.15em] uppercase mb-3 text-center">
                  Avoid
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {currentDay.avoid_windows.map((w, i) => (
                    <div
                      key={i}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-caution/10 border border-caution/20"
                    >
                      <span className="font-mono text-mono-sm text-caution">
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

      {/* On-demand prose status for far-window days */}
      {currentNeedsProse && proseLoading && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-sm bg-amber/5 border border-amber/20 animate-pulse">
          <span className="text-amber" aria-hidden>✍️</span>
          <span className="font-body text-body-sm text-dust">
            Writing this day&apos;s hour-by-hour commentary just for you… the scores below are already exact.
          </span>
        </div>
      )}
      {currentNeedsProse && !proseLoading && proseError && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-sm bg-caution/5 border border-caution/20">
          <span className="font-body text-body-sm text-dust">{proseError}</span>
          <button
            type="button"
            className="font-mono text-mono-sm text-amber underline underline-offset-2 hover:text-amber-light"
            onClick={() => {
              proseAttempted.current.delete(currentDate);
              setProseRetryTick((t) => t + 1);
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Hourly analysis for the active day — rendered inline */}
      {hourlyData.length > 0 && (
        <HourlyAnalysis hours={hourlyData} lagna={lagna} />
      )}
    </motion.div>
  );
}
