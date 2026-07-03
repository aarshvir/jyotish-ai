'use client';

/**
 * CorrelationsPanel — "Your personal rhythm": four pattern insights computed
 * entirely client-side from data already in the report (no API calls, no deps).
 *
 *   1. Power hours      — average slot score by hour-of-day (horizontal bars)
 *   2. Best weekdays    — average day_score by weekday (vertical bars)
 *   3. Moon-sign rhythm — average day_score by transiting Moon sign (ranked list)
 *   4. Score momentum   — day_score sparkline with peak/trough + best stretch
 *
 * Each insight guards its own data (renders nothing below 3 data points);
 * the whole section renders nothing if no insight survives.
 */

import { useMemo, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface HourSlot {
  time?: string;
  end_time?: string;
  display_label?: string;
  score?: number;
  hora_planet?: string;
  choghadiya?: string;
  is_rahu_kaal?: boolean;
}

interface DayData {
  date: string;
  day_score: number;
  panchang?: {
    tithi?: string;
    nakshatra?: string;
    yoga?: string;
    moon_sign?: string;
  };
  hourlySlots?: HourSlot[];
}

interface CorrelationsPanelProps {
  days: DayData[];
  /** e.g. "Venus" — the running mahadasha, woven into the subtitle. */
  dashaLabel?: string;
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_PLURAL = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
/** Display order: Monday-first. */
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** "2026-06-24" -> "Jun 24". */
function prettyDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const mi = Math.max(0, Math.min(11, parseInt(m[2], 10) - 1));
  return `${MONTH_SHORT[mi]} ${parseInt(m[3], 10)}`;
}

/** 10 -> "10:00–11:00". */
function hourRange(h: number): string {
  return `${pad2(h)}:00–${pad2(h + 1)}:00`;
}

/** 10 -> "10–11" (compact row label for 375px). */
function hourRangeShort(h: number): string {
  return `${pad2(h)}–${pad2(h + 1)}`;
}

/** Score color convention: >=65 success, 45–64 amber, <45 caution. */
function scorePillClass(score: number): string {
  if (score >= 65) return 'score-bg-excellent score-excellent';
  if (score >= 45) return 'score-bg-good score-good';
  return 'score-bg-caution score-caution';
}

interface HourRow {
  hour: number;
  avg: number;
  n: number;
}

interface WeekdayRow {
  /** 0 = Sunday … 6 = Saturday. */
  idx: number;
  avg: number | null;
  n: number;
}

interface SignRow {
  sign: string;
  avg: number;
  n: number;
}

interface SparkPoint {
  x: number;
  y: number;
  date: string;
  score: number;
}

function InsightCard({ title, takeaway, children }: { title: string; takeaway: string; children: ReactNode }) {
  return (
    <div className="bg-cosmos border border-horizon rounded-sm p-5 sm:p-6 flex flex-col">
      <p className="font-mono text-mono-sm text-amber tracking-[0.2em] uppercase mb-4">{title}</p>
      <div className="flex-1">{children}</div>
      <p className="font-body text-body-sm text-dust leading-relaxed border-t border-horizon/40 pt-3 mt-4">
        {takeaway}
      </p>
    </div>
  );
}

export function CorrelationsPanel({ days, dashaLabel }: CorrelationsPanelProps) {
  const reduceMotion = useReducedMotion();

  const computed = useMemo(() => {
    const validDays = (days ?? []).filter(
      (d): d is DayData => Boolean(d) && typeof d.day_score === 'number' && Number.isFinite(d.day_score),
    );

    // ── 1. Power hours: average slot score by hour-of-day ──────────────────
    const hourAgg = new Map<number, { sum: number; n: number }>();
    for (const d of validDays) {
      for (const s of d.hourlySlots ?? []) {
        if (typeof s?.score !== 'number' || !Number.isFinite(s.score)) continue;
        const hh = parseInt((s.time ?? '').slice(0, 2), 10);
        if (!Number.isFinite(hh) || hh < 0 || hh > 23) continue;
        const cur = hourAgg.get(hh) ?? { sum: 0, n: 0 };
        cur.sum += s.score;
        cur.n += 1;
        hourAgg.set(hh, cur);
      }
    }
    const hourRows: HourRow[] = Array.from(hourAgg.entries())
      .map(([hour, a]) => ({ hour, avg: Math.round(a.sum / a.n), n: a.n }))
      .sort((a, b) => a.hour - b.hour);
    const totalSlots = hourRows.reduce((s, r) => s + r.n, 0);
    const topHours = [...hourRows]
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 3)
      .map((r) => r.hour);
    const bestHour = hourRows.length ? [...hourRows].sort((a, b) => b.avg - a.avg)[0] : null;
    const maxHourAvg = hourRows.reduce((m, r) => Math.max(m, r.avg), 0);
    const powerHours =
      hourRows.length >= 3 && totalSlots >= 3 && bestHour && maxHourAvg > 0
        ? { rows: hourRows, topHours, best: bestHour, maxAvg: maxHourAvg }
        : null;

    // ── 2. Best days of the week: average day_score by weekday ─────────────
    const wdAgg = Array.from({ length: 7 }, () => ({ sum: 0, n: 0 }));
    let datedDays = 0;
    for (const d of validDays) {
      const dt = new Date(`${(d.date ?? '').slice(0, 10)}T00:00:00`);
      if (isNaN(dt.getTime())) continue;
      datedDays += 1;
      const w = dt.getDay();
      wdAgg[w].sum += d.day_score;
      wdAgg[w].n += 1;
    }
    const weekdayRows: WeekdayRow[] = WEEKDAY_ORDER.map((idx) => ({
      idx,
      avg: wdAgg[idx].n > 0 ? Math.round(wdAgg[idx].sum / wdAgg[idx].n) : null,
      n: wdAgg[idx].n,
    }));
    const bestWeekday = weekdayRows.reduce<WeekdayRow | null>(
      (best, r) => (r.avg !== null && (best === null || best.avg === null || r.avg > best.avg) ? r : best),
      null,
    );
    const weekdays = datedDays >= 3 && bestWeekday ? { rows: weekdayRows, best: bestWeekday } : null;

    // ── 3. Moon-sign rhythm: average day_score by transiting Moon sign ─────
    const signAgg = new Map<string, { sum: number; n: number }>();
    for (const d of validDays) {
      const sign = d.panchang?.moon_sign?.trim();
      if (!sign) continue;
      const cur = signAgg.get(sign) ?? { sum: 0, n: 0 };
      cur.sum += d.day_score;
      cur.n += 1;
      signAgg.set(sign, cur);
    }
    const signRows: SignRow[] = Array.from(signAgg.entries())
      .map(([sign, a]) => ({ sign, avg: Math.round(a.sum / a.n), n: a.n }))
      .sort((a, b) => b.avg - a.avg);
    const moonRhythm =
      signRows.length >= 3
        ? {
            top: signRows.slice(0, 3),
            // Only show a distinct "lowest" row when it isn't already in the top 3.
            bottom: signRows.length > 3 ? signRows[signRows.length - 1] : null,
          }
        : null;

    // ── 4. Score momentum: sparkline + peak/trough + strongest stretch ─────
    const seq = validDays
      .filter((d) => /^\d{4}-\d{2}-\d{2}/.test(d.date ?? ''))
      .map((d) => ({ date: d.date.slice(0, 10), score: d.day_score }))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    let momentum: {
      pts: SparkPoint[];
      peakI: number;
      troughI: number;
      stretch: { from: string; to: string; avg: number };
    } | null = null;
    if (seq.length >= 3) {
      const scores = seq.map((d) => d.score);
      const min = Math.min(...scores);
      const max = Math.max(...scores);
      const span = max - min;
      const X0 = 8;
      const X1 = 292;
      const Y_TOP = 20; // y of the highest score
      const Y_BOT = 76; // y of the lowest score
      const pts: SparkPoint[] = seq.map((d, i) => {
        const t = span === 0 ? 0.5 : (d.score - min) / span;
        return {
          x: X0 + ((X1 - X0) * i) / (seq.length - 1),
          y: Y_BOT - (Y_BOT - Y_TOP) * t,
          date: d.date,
          score: d.score,
        };
      });
      let peakI = 0;
      let troughI = 0;
      scores.forEach((s, i) => {
        if (s > scores[peakI]) peakI = i;
        if (s < scores[troughI]) troughI = i;
      });
      const w = Math.min(4, seq.length);
      let bestStart = 0;
      let bestSum = -Infinity;
      for (let i = 0; i + w <= seq.length; i++) {
        const sum = scores.slice(i, i + w).reduce((a, b) => a + b, 0);
        if (sum > bestSum) {
          bestSum = sum;
          bestStart = i;
        }
      }
      momentum = {
        pts,
        peakI,
        troughI,
        stretch: {
          from: seq[bestStart].date,
          to: seq[bestStart + w - 1].date,
          avg: Math.round(bestSum / w),
        },
      };
    }

    return { powerHours, weekdays, moonRhythm, momentum, dayCount: validDays.length };
  }, [days]);

  const { powerHours, weekdays, moonRhythm, momentum, dayCount } = computed;

  if (!powerHours && !weekdays && !moonRhythm && !momentum) return null;

  const barTransition = (i: number) =>
    reduceMotion ? { duration: 0 } : { duration: 0.5, delay: i * 0.02, ease: 'easeOut' as const };

  const sparkAnchor = (x: number): 'start' | 'middle' | 'end' =>
    x < 45 ? 'start' : x > 255 ? 'end' : 'middle';

  return (
    <motion.section
      id="correlations"
      aria-labelledby="correlations-heading"
      initial={reduceMotion ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: reduceMotion ? 0 : 0.6 }}
      className="space-y-6 mb-12 scroll-mt-24"
    >
      <div>
        <p className="section-eyebrow">Patterns · decoded from your chart</p>
        <h2 id="correlations-heading" className="font-display font-semibold text-star text-3xl">
          Your personal rhythm
        </h2>
        <p className="font-mono text-mono-sm text-dust/60 mt-2 max-w-2xl">
          Recurring patterns computed from the {dayCount} scored day{dayCount === 1 ? '' : 's'} in your forecast
          {dashaLabel ? (
            <>
              {' '}during your <span className="text-amber/80">{dashaLabel}</span> period
            </>
          ) : null}
          . No two charts repeat the same rhythm.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ── 1. Power hours ─────────────────────────────────────────────── */}
        {powerHours && (
          <InsightCard
            title="Your power hours"
            takeaway={`Your strongest window is ${hourRange(powerHours.best.hour)}, averaging ${powerHours.best.avg}/100 across your forecast — schedule what matters most there.`}
          >
            <div className="space-y-1.5" role="img" aria-label="Average score by hour of day">
              {powerHours.rows.map((r, i) => {
                const isTop = powerHours.topHours.includes(r.hour);
                const pct = Math.max(4, (r.avg / powerHours.maxAvg) * 100);
                return (
                  <div key={r.hour} className="flex items-center gap-2">
                    <span className="w-11 shrink-0 font-mono text-mono-sm text-dust/70 tabular-nums">
                      {hourRangeShort(r.hour)}
                    </span>
                    <div className="flex-1 h-3 rounded-sm bg-nebula/50 overflow-hidden">
                      <motion.div
                        initial={reduceMotion ? false : { width: 0 }}
                        whileInView={{ width: `${pct}%` }}
                        viewport={{ once: true }}
                        transition={barTransition(i)}
                        className={`h-full rounded-sm ${isTop ? 'bg-amber' : 'bg-dust/30'}`}
                      />
                    </div>
                    <span
                      className={`w-7 shrink-0 text-right font-mono text-mono-sm tabular-nums ${
                        isTop ? 'text-amber' : 'text-dust/60'
                      }`}
                    >
                      {r.avg}
                    </span>
                  </div>
                );
              })}
            </div>
          </InsightCard>
        )}

        {/* ── 2. Best days of the week ───────────────────────────────────── */}
        {weekdays && (
          <InsightCard
            title="Best days of the week"
            takeaway={`${WEEKDAY_PLURAL[weekdays.best.idx]} run strongest for you, averaging ${weekdays.best.avg}/100 — a good default for launches and big conversations.`}
          >
            <div className="flex items-end gap-1.5 sm:gap-2" role="img" aria-label="Average day score by weekday">
              {weekdays.rows.map((r, i) => {
                const isBest = r.idx === weekdays.best.idx && r.avg !== null;
                return (
                  <div key={r.idx} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    <span
                      className={`font-mono text-mono-sm tabular-nums ${
                        isBest ? 'text-amber' : 'text-dust/60'
                      }`}
                    >
                      {r.avg ?? '–'}
                    </span>
                    <div className="relative w-full max-w-[2rem] h-20 rounded-sm bg-nebula/50 overflow-hidden">
                      {r.avg !== null && (
                        <motion.div
                          initial={reduceMotion ? false : { height: 0 }}
                          whileInView={{ height: `${Math.max(4, r.avg)}%` }}
                          viewport={{ once: true }}
                          transition={barTransition(i)}
                          className={`absolute bottom-0 left-0 right-0 rounded-sm ${
                            isBest ? 'bg-amber' : 'bg-dust/30'
                          }`}
                        />
                      )}
                    </div>
                    <span
                      className={`font-mono text-mono-sm uppercase ${
                        isBest ? 'text-amber' : 'text-dust/60'
                      }`}
                    >
                      {WEEKDAY_SHORT[r.idx]}
                    </span>
                  </div>
                );
              })}
            </div>
          </InsightCard>
        )}

        {/* ── 3. Moon-sign rhythm ────────────────────────────────────────── */}
        {moonRhythm && (
          <InsightCard
            title="Moon-sign rhythm"
            takeaway={`You peak when the Moon transits ${moonRhythm.top[0].sign} (average ${moonRhythm.top[0].avg}/100)${
              moonRhythm.bottom
                ? `, and run quieter under a ${moonRhythm.bottom.sign} Moon (${moonRhythm.bottom.avg}/100).`
                : '.'
            }`}
          >
            <ul className="space-y-2.5">
              {moonRhythm.top.map((s, i) => (
                <li key={s.sign} className="flex items-center gap-3">
                  <span className="w-4 shrink-0 font-mono text-mono-sm text-dust/50 tabular-nums">{i + 1}</span>
                  <span className="flex-1 font-body text-body-sm text-star truncate">{s.sign} Moon</span>
                  <span className="font-mono text-mono-sm text-dust/50">
                    {s.n} day{s.n === 1 ? '' : 's'}
                  </span>
                  <span
                    className={`border rounded-pill px-2.5 py-0.5 font-mono text-mono-sm tabular-nums ${scorePillClass(s.avg)}`}
                  >
                    {s.avg}
                  </span>
                </li>
              ))}
              {moonRhythm.bottom && (
                <li className="flex items-center gap-3 border-t border-horizon/40 pt-2.5">
                  <span className="w-4 shrink-0 font-mono text-mono-sm text-dust/50" aria-hidden>
                    ↓
                  </span>
                  <span className="flex-1 font-body text-body-sm text-dust truncate">
                    {moonRhythm.bottom.sign} Moon
                  </span>
                  <span className="font-mono text-mono-sm text-dust/50">
                    {moonRhythm.bottom.n} day{moonRhythm.bottom.n === 1 ? '' : 's'}
                  </span>
                  <span
                    className={`border rounded-pill px-2.5 py-0.5 font-mono text-mono-sm tabular-nums ${scorePillClass(moonRhythm.bottom.avg)}`}
                  >
                    {moonRhythm.bottom.avg}
                  </span>
                </li>
              )}
            </ul>
          </InsightCard>
        )}

        {/* ── 4. Score momentum ──────────────────────────────────────────── */}
        {momentum && (
          <InsightCard
            title="Score momentum"
            takeaway={`Your strongest stretch: ${prettyDate(momentum.stretch.from)} – ${prettyDate(momentum.stretch.to)}, averaging ${momentum.stretch.avg}/100 a day.`}
          >
            <svg
              viewBox="0 0 300 96"
              className="w-full h-auto"
              role="img"
              aria-label={`Day score trend: peak ${momentum.pts[momentum.peakI].score} on ${prettyDate(
                momentum.pts[momentum.peakI].date,
              )}, low ${momentum.pts[momentum.troughI].score} on ${prettyDate(momentum.pts[momentum.troughI].date)}`}
            >
              <polyline
                points={momentum.pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
                fill="none"
                stroke="var(--amber)"
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity="0.9"
              />
              {/* Peak marker + label */}
              <circle
                cx={momentum.pts[momentum.peakI].x}
                cy={momentum.pts[momentum.peakI].y}
                r="3"
                fill="var(--success)"
              />
              <text
                x={momentum.pts[momentum.peakI].x}
                y={Math.max(10, momentum.pts[momentum.peakI].y - 8)}
                textAnchor={sparkAnchor(momentum.pts[momentum.peakI].x)}
                fontSize="9"
                fill="var(--success)"
                className="font-mono"
              >
                {prettyDate(momentum.pts[momentum.peakI].date)} · {momentum.pts[momentum.peakI].score}
              </text>
              {/* Trough marker + label (skip when flat: peak === trough) */}
              {momentum.troughI !== momentum.peakI && (
                <>
                  <circle
                    cx={momentum.pts[momentum.troughI].x}
                    cy={momentum.pts[momentum.troughI].y}
                    r="3"
                    fill="var(--caution)"
                  />
                  <text
                    x={momentum.pts[momentum.troughI].x}
                    y={Math.min(93, momentum.pts[momentum.troughI].y + 14)}
                    textAnchor={sparkAnchor(momentum.pts[momentum.troughI].x)}
                    fontSize="9"
                    fill="var(--caution)"
                    className="font-mono"
                  >
                    {prettyDate(momentum.pts[momentum.troughI].date)} · {momentum.pts[momentum.troughI].score}
                  </text>
                </>
              )}
            </svg>
            <div className="flex justify-between mt-1">
              <span className="font-mono text-mono-sm text-dust/50">{prettyDate(momentum.pts[0].date)}</span>
              <span className="font-mono text-mono-sm text-dust/50">
                {prettyDate(momentum.pts[momentum.pts.length - 1].date)}
              </span>
            </div>
          </InsightCard>
        )}
      </div>
    </motion.section>
  );
}
