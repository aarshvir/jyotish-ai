/**
 * Everything /sample-report shows, worked out from the generated sample (sampleForecast.ts) and the
 * invented reader's answers (sampleReader.ts). Pure and deterministic, so the page renders statically
 * (ad capture, search crawlers) and a test can check what it says.
 *
 * The brief, the section order and each "why this is in your report" line come from the same functions the
 * paid report page uses (src/lib/personalization/forecastView.ts), not from copy written for the sample.
 */

import { dayWord } from '@/lib/blueprint/days';
import {
  bestHoursOf,
  buildForecastBrief,
  forecastWhy,
  personalizationStamp,
  type DayView,
  type ForecastBrief,
  type ForecastKey,
  type MonthView,
} from '@/lib/personalization/forecastView';
import { SAMPLE_FORECAST as F, type SampleDayRow, type SampleMonth, type SampleWeek } from './sampleForecast';
import { SAMPLE_READER_CONTEXT, SAMPLE_READER_NAME } from './sampleReader';

export { SAMPLE_FORECAST } from './sampleForecast';
export const READER_NAME = SAMPLE_READER_NAME;

// ── dates and clock times ─────────────────────────────────────────────────────

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-11-03" -> "Tue 3 Nov" */
export function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "2026-11-03" -> "3 Nov 2026" */
export function plainDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "06:00–07:00" -> "6 – 7 am"; "11:00–12:00" -> "11 am – 12 pm". Never 24-hour. */
export function formatRange(label: string): string {
  const [from, to] = label.split('–').map((p) => Number(p.slice(0, 2)));
  const clock = (h: number) => {
    const norm = h % 24;
    return norm % 12 === 0 ? 12 : norm % 12;
  };
  const meridiem = (h: number) => (h % 24 < 12 ? 'am' : 'pm');
  return meridiem(from) === meridiem(to) ? `${clock(from)} – ${clock(to)} ${meridiem(to)}` : `${clock(from)} ${meridiem(from)} – ${clock(to)} ${meridiem(to)}`;
}

/** "14:57–16:24" -> "2:57 – 4:24 pm" */
export function formatClockRange(label: string): string {
  const m = label.match(/^(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})$/);
  if (!m) return label;
  const part = (h: number, min: string) => `${h % 12 === 0 ? 12 : h % 12}:${min}`;
  const h1 = Number(m[1]);
  const h2 = Number(m[3]);
  const mer = (h: number) => (h % 24 < 12 ? 'am' : 'pm');
  return mer(h1) === mer(h2) ? `${part(h1, m[2])} – ${part(h2, m[4])} ${mer(h2)}` : `${part(h1, m[2])} ${mer(h1)} – ${part(h2, m[4])} ${mer(h2)}`;
}

// ── tiers (docs/DESIGN_SYSTEM.md, one 5-tier scale) ───────────────────────────

export type Tier = { word: string; text: string; accent: string; tint: string };

const TIERS: { min: number; tier: Tier }[] = [
  { min: 80, tier: { word: 'Strong', text: '#226B48', accent: '#226B48', tint: 'rgba(34,107,72,0.10)' } },
  { min: 60, tier: { word: 'Favourable', text: '#2E7A52', accent: '#5FAE86', tint: 'rgba(59,140,99,0.09)' } },
  { min: 40, tier: { word: 'Mixed', text: '#8A6318', accent: '#C79A3C', tint: 'rgba(138,99,24,0.09)' } },
  { min: 20, tier: { word: 'Guarded', text: '#A9541F', accent: '#D08050', tint: 'rgba(169,84,31,0.10)' } },
  { min: 0, tier: { word: 'Avoid', text: '#8E3418', accent: '#C05B38', tint: 'rgba(142,52,24,0.11)' } },
];

/** Colour and word for an hour or a life-area score. */
export function tierOf(score: number): Tier {
  return (TIERS.find((t) => score >= t.min) ?? TIERS[TIERS.length - 1]).tier;
}

/**
 * Colour for a whole day, with the word the paid report uses for it (dayWord), so this page and the
 * brief at its top never call the same score two different things.
 */
export function dayTier(score: number): Tier {
  const base = tierOf(score);
  return { ...base, word: dayWord(score) };
}

// ── the reader's brief, order and provenance ──────────────────────────────────

export const DAYS: SampleDayRow[] = F.days;

export const DAY_VIEWS: DayView[] = DAYS.map((d) => ({
  date: d.date,
  score: d.score,
  rahuKaal: d.rahuKaal,
  slots: d.slots.map((s) => ({ label: s.label, score: s.score, rahuKaal: s.rahuKaal })),
}));

export const MONTH_VIEWS: MonthView[] = F.written.months.map((m) => ({ month: m.label, score: m.overall, theme: m.theme }));

const STAMP = personalizationStamp(SAMPLE_READER_CONTEXT, F.window.start);

export const BRIEF: ForecastBrief = buildForecastBrief({
  personalContext: SAMPLE_READER_CONTEXT,
  name: SAMPLE_READER_NAME,
  days: DAY_VIEWS,
  months: MONTH_VIEWS,
  stamp: STAMP,
  lagna: F.chart.lagna,
})!;

/** The sections this page renders, in the order the reader's answers put them in (see forecastOrder). */
export const RENDERED_SECTIONS: ForecastKey[] = ['decide', 'weekly', 'monthly', 'daily', 'synthesis'];
export const SECTION_ORDER: ForecastKey[] = BRIEF.order.order.filter((k) => RENDERED_SECTIONS.includes(k));

export function whyLine(key: ForecastKey): string {
  return forecastWhy(key, { profile: BRIEF.profile, moved: BRIEF.order.moved, eventDate: BRIEF.eventDate, stamp: STAMP });
}

// ── chart facts ───────────────────────────────────────────────────────────────

export const CHART = F.chart;
export const MOON = CHART.placements.find((p) => p.planet === 'Moon')!;

/** Minutes of birth time before the Moon would change sign (it moves about 13.2 degrees a day). */
export const MOON_SIGN_MARGIN_MINUTES = Math.round(((30 - MOON.degree) / 13.2) * 24 * 60);

export const MAHADASHA = CHART.mahadashas.find((d) => d.lord === CHART.currentDasha.mahadasha)!;
export const ANTARDASHAS = CHART.antardashas;
export const CURRENT_ANTARDASHA = ANTARDASHAS.find((a) => a.start <= F.window.start && F.window.start < a.end) ?? ANTARDASHAS[0];

// ── month at a glance ─────────────────────────────────────────────────────────

export const FIRST_MONTH: SampleMonth = F.written.months[0];

export const AREAS: { name: string; score: number }[] = [
  { name: 'Career', score: FIRST_MONTH.career },
  { name: 'Money', score: FIRST_MONTH.money },
  { name: 'Health', score: FIRST_MONTH.health },
  { name: 'Relationships', score: FIRST_MONTH.love },
  { name: 'Intimacy', score: FIRST_MONTH.intimacy },
];

export const WINDOW_AVERAGE = Math.round(DAYS.reduce((a, d) => a + d.score, 0) / DAYS.length);

/** Monday-first calendar rows for the 30 days, with leading blanks so each date sits under its weekday. */
export function calendarRows(): (SampleDayRow | null)[][] {
  const lead = (new Date(`${DAYS[0].date}T00:00:00Z`).getUTCDay() + 6) % 7;
  const cells: (SampleDayRow | null)[] = [...Array<null>(lead).fill(null), ...DAYS];
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (SampleDayRow | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

// ── best and hardest days ─────────────────────────────────────────────────────

const RANKED = [...DAY_VIEWS].sort((a, b) => b.score - a.score || a.date.localeCompare(b.date));
export const STRONGEST_DAYS: (DayView & { hours: string[] })[] = RANKED.slice(0, 3).map((d) => ({ ...d, hours: bestHoursOf(d) }));
export const QUIETEST_DAYS: DayView[] = RANKED.slice(-3).reverse();

// ── weeks, months, the interview day ──────────────────────────────────────────

export const WEEKS: SampleWeek[] = F.written.weeks;
export const MONTH_ROWS: SampleMonth[] = F.written.months;
export const SYNTHESIS = F.written.synthesis;
export const NATIVITY = F.written.nativity;

export const EVENT_DATE = F.event.date;
export const EVENT_DAY: SampleDayRow = DAYS.find((d) => d.date === EVENT_DATE)!;
export const DAILY_NOTES = F.written.daily;
export const HOURLY = F.written.hourly;

/** Splits a day note into paragraphs, and the "YOUR STRATEGY" block into its numbered lines. */
export type NoteBlock = { kind: 'p'; text: string } | { kind: 'h'; text: string } | { kind: 'li'; text: string };

export function noteBlocks(overview: string): NoteBlock[] {
  const out: NoteBlock[] = [];
  for (const chunk of overview.split(/\n{2,}/)) {
    for (const raw of chunk.split('\n')) {
      const line = raw.trim();
      if (!line) continue;
      if (/^YOUR STRATEGY:?$/i.test(line)) out.push({ kind: 'h', text: 'Your strategy' });
      else if (/^\d+\.\s+/.test(line)) out.push({ kind: 'li', text: line.replace(/^\d+\.\s+/, '') });
      else out.push({ kind: 'p', text: line });
    }
  }
  return out;
}

/**
 * An hour's note arrives as a paragraph that opens with the planet's role for this chart, then what to do with the
 * hour, then one or two more paragraphs. The action is what the reader wants first; the role goes behind "more".
 */
export function splitHourly(full: string): { role: string; action: string; more: string[] } {
  const paras = full.split(/\n{2,}/).map((x) => x.trim()).filter(Boolean);
  const first = paras[0] ?? '';
  const m = first.match(/^(.+?[.!?])\s+([\s\S]*)$/);
  const role = m ? m[1] : first;
  const action = m ? m[2] : '';
  return { role, action: action || (paras[1] ?? ''), more: action ? paras.slice(1) : paras.slice(2) };
}
