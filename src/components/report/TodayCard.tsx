'use client';

/**
 * TodayCard — the "Today" hero card that anchors the report to RIGHT NOW.
 *
 * Finds today's date in the forecast days (using the report timezone offset when
 * provided, else the viewer's local clock) and leads with the day score, the next
 * best window still ahead of the current time, and the Rahu Kaal avoid window.
 * If today falls outside the forecast range it degrades gracefully to a
 * "Your forecast starts {date}" teaser using the first upcoming day.
 *
 * Pure presentation — consumes the same mergedDays shape page.tsx already builds.
 */

import { useEffect, useMemo, useState } from 'react';
import { motion, animate, useReducedMotion } from 'framer-motion';
import { formatDayOutcomeLabel } from '@/lib/guidance/labels';
import { plainify } from '@/lib/utils/plainify';

interface HourSlot {
  slot_index?: number;
  display_label?: string;
  time: string;
  end_time: string;
  score: number;
  hora_planet?: string;
  hora_planet_symbol?: string;
  choghadiya?: string;
  choghadiya_quality?: string;
  is_rahu_kaal: boolean;
  transit_lagna?: string;
  transit_lagna_house?: number;
  commentary?: string;
}

interface DayData {
  date: string;
  day_score: number;
  day_theme?: string;
  day_rating_label?: string;
  rahu_kaal?: { start: string; end: string } | null;
  hourlySlots?: HourSlot[];
}

interface TodayCardProps {
  days: DayData[];
  /** Report timezone offset in minutes east of UTC (page.tsx reportTimezoneOffset). */
  timezoneOffset?: number;
  /** Jump to a day in DailyAnalysis (page.tsx handleDaySelectFromCalendar). */
  onJumpToDay?: (index: number) => void;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** "HH:MM" → minutes since midnight, or null when unparseable. */
function toMinutes(hhmm: string | undefined): number | null {
  if (!hhmm) return null;
  const m = /^([01]?\d|2[0-3]):([0-5]\d)/.exec(hhmm.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Current date + minutes-of-day in the report timezone (else viewer-local). */
function nowInReportTz(offsetMinutes?: number): { dateStr: string; minutes: number } {
  const now = new Date();
  if (typeof offsetMinutes === 'number' && Number.isFinite(offsetMinutes)) {
    const shifted = new Date(now.getTime() + offsetMinutes * 60_000);
    return {
      dateStr: `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`,
      minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
    };
  }
  return {
    dateStr: `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`,
    minutes: now.getHours() * 60 + now.getMinutes(),
  };
}

/** "2026-07-02" → "Thu, Jul 2". */
function prettyDate(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${dayNames[d.getDay()]}, ${monthNames[d.getMonth()]} ${d.getDate()}`;
}

/** Score color convention: ≥65 success, 45–64 amber, <45 caution. */
function scoreColorClass(score: number): string {
  if (score >= 65) return 'text-success';
  if (score >= 45) return 'text-amber';
  return 'text-caution';
}

export function TodayCard({ days, timezoneOffset, onJumpToDay }: TodayCardProps) {
  const prefersReduced = useReducedMotion();

  // "Now" in the report's timezone, captured once per mount.
  const now = useMemo(() => nowInReportTz(timezoneOffset), [timezoneOffset]);

  // Resolve the anchor day: today if in range, else the first upcoming day, else day 0.
  const todayIdx = (days ?? []).findIndex((d) => (d?.date ?? '').slice(0, 10) === now.dateStr);
  const isToday = todayIdx >= 0;
  const upcomingIdx = isToday
    ? todayIdx
    : (days ?? []).findIndex((d) => (d?.date ?? '').slice(0, 10) >= now.dateStr);
  const dayIndex = upcomingIdx >= 0 ? upcomingIdx : 0;
  const day = (days ?? [])[dayIndex];

  const score = day?.day_score ?? 50;

  // Best window: highest-scoring non-Rahu-Kaal slot whose end is still ahead of
  // now (today only); when none remain (or not today), the day's best overall.
  const bestWindow = useMemo(() => {
    const slots = (day?.hourlySlots ?? []).filter((s) => s && !s.is_rahu_kaal);
    if (slots.length === 0) return null;
    const ahead = isToday
      ? slots.filter((s) => {
          const end = toMinutes(s.end_time);
          return end != null && end > now.minutes;
        })
      : [];
    const pool = ahead.length > 0 ? ahead : slots;
    const slot = pool.reduce((best, s) => (s.score > best.score ? s : best));
    return { slot, isAhead: ahead.length > 0 };
  }, [day, isToday, now.minutes]);

  // Animated count-up (skipped under prefers-reduced-motion).
  const [displayScore, setDisplayScore] = useState(0);
  useEffect(() => {
    if (prefersReduced) {
      setDisplayScore(score);
      return;
    }
    const controls = animate(0, score, {
      duration: 1.1,
      ease: 'easeOut',
      onUpdate: (v) => setDisplayScore(Math.round(v)),
    });
    return () => controls.stop();
  }, [score, prefersReduced]);

  if (!day) return null;

  const ratingLabel = day.day_rating_label || formatDayOutcomeLabel(score);
  const theme = plainify(day.day_theme ?? '');
  const rk = day.rahu_kaal;
  const hasRahu = !!(rk && (rk.start || rk.end));
  const windowLabel = bestWindow
    ? bestWindow.slot.display_label || `${bestWindow.slot.time}–${bestWindow.slot.end_time}`
    : '';
  const bestChipLabel = isToday
    ? bestWindow?.isAhead
      ? 'Next best window'
      : "Today's best"
    : 'Best window';

  return (
    <motion.section
      id="today"
      aria-labelledby="today-heading"
      initial={prefersReduced ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="mb-12 scroll-mt-24"
    >
      <div className="card relative overflow-hidden border-amber/25 shadow-glow-amber p-6 sm:p-8">
        {/* Subtle amber glow */}
        <div className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 rounded-full bg-amber/10 blur-3xl" />

        <p className="section-eyebrow mb-4">
          {isToday ? `Today · ${prettyDate(day.date)}` : `Next up · ${prettyDate(day.date)}`}
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-10">
          {/* Big animated day score */}
          <div className="flex items-baseline gap-2 shrink-0">
            <span
              aria-hidden="true"
              className={`font-display font-semibold leading-none tabular-nums text-7xl sm:text-8xl ${scoreColorClass(score)}`}
            >
              {displayScore}
            </span>
            <span aria-hidden="true" className="font-body text-dust text-lg">
              /100
            </span>
            <span className="sr-only">{`Day score ${score} out of 100`}</span>
          </div>

          <div className="min-w-0 flex-1">
            <h2 id="today-heading" className="font-display text-headline-lg text-star mb-1">
              {isToday ? ratingLabel : `Your forecast starts ${prettyDate(day.date)}`}
            </h2>
            {!isToday && (
              <p className="font-mono text-mono-sm text-dust/70 uppercase tracking-wider mb-1.5">
                Next up · {ratingLabel}
              </p>
            )}
            {theme && (
              <p className="font-body text-body-md text-dust leading-relaxed max-w-2xl">{theme}</p>
            )}
          </div>
        </div>

        {/* Timing chips — best window / Rahu Kaal avoid */}
        {(bestWindow || hasRahu) && (
          <div className="flex flex-wrap gap-3 mt-6">
            {bestWindow && (
              <div className="inline-flex items-center gap-2 rounded-pill bg-success/10 border border-success/30 px-4 py-2">
                <span className="font-mono text-mono-sm text-success uppercase tracking-wider">
                  {bestChipLabel}
                </span>
                <span className="font-body text-body-sm text-star">{windowLabel}</span>
                <span className={`font-mono text-mono-sm ${scoreColorClass(bestWindow.slot.score)}`}>
                  {bestWindow.slot.score}
                </span>
              </div>
            )}
            {hasRahu && (
              <div className="inline-flex items-center gap-2 rounded-pill bg-caution/10 border border-caution/30 px-4 py-2">
                <span className="font-mono text-mono-sm text-caution uppercase tracking-wider">Avoid</span>
                <span className="font-body text-body-sm text-star">
                  Rahu Kaal {(rk?.start ?? '').slice(0, 5)}–{(rk?.end ?? '').slice(0, 5)}
                </span>
              </div>
            )}
          </div>
        )}

        {onJumpToDay && (
          <button
            type="button"
            onClick={() => onJumpToDay(dayIndex)}
            className="btn-primary mt-6 w-full sm:w-auto px-6"
          >
            {isToday ? 'See full day →' : 'See first day →'}
          </button>
        )}
      </div>
    </motion.section>
  );
}
