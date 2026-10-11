/**
 * Day-level views built from the ephemeris engine's daily grid, shared by the 30-day add-on
 * and the "weeks around your date" section. Pure: grid days in, tables and facts out.
 */

import { getDayOutcomeTier } from '@/lib/guidance/labels';
import { SIGNS } from '@/lib/funnel/reveal/astro';
import { addDays } from '@/lib/personalization/eventDate';
import type { GridDay } from './deps';
import type { BlueprintParagraph, BlueprintTable, NodalWindow } from './types';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

const TIER_WORD: Record<string, string> = {
  EXCELLENT: 'very supportive',
  FAVORABLE: 'supportive',
  MODERATE: 'steady',
  CAUTION: 'slower',
  CHALLENGING: 'heavier',
  AVOID: 'heaviest',
};
export const dayWord = (score: number) => TIER_WORD[getDayOutcomeTier(score).tier];

/** The strongest slot of a day, outside Rahu Kaal. */
export function bestSlot(d: GridDay): { label: string; score: number } | null {
  const ok = d.slots.filter((s) => !s.is_rahu_kaal);
  if (ok.length === 0) return null;
  const top = ok.reduce((a, b) => (b.score > a.score ? b : a));
  return { label: top.display_label, score: top.score };
}

/** Best three separate hours of the day (no two adjacent), outside Rahu Kaal. */
export function bestHours(d: GridDay, n = 3): string[] {
  const ranked = d.slots.filter((s) => !s.is_rahu_kaal).sort((a, b) => b.score - a.score);
  const picked: typeof ranked = [];
  for (const s of ranked) {
    if (picked.every((p) => Math.abs(p.slot_index - s.slot_index) > 1)) picked.push(s);
    if (picked.length === n) break;
  }
  return picked.sort((a, b) => a.slot_index - b.slot_index).map((s) => s.display_label);
}

const hm = (t: string) => t.slice(0, 5);
export const rahuKaalText = (d: GridDay) => (d.rahu_kaal ? `${hm(d.rahu_kaal.start)}–${hm(d.rahu_kaal.end)}` : '');

/** Smallest angular gap between the Moon and either node, in degrees (null if positions are missing). */
export function moonNodeGap(d: GridDay): number | null {
  const p = d.planet_positions?.planets;
  if (!p?.Moon || !p?.Rahu) return null;
  const lon = (x: { sign: string; degree: number }) => SIGNS.indexOf(x.sign as (typeof SIGNS)[number]) * 30 + x.degree;
  const diff = (a: number, b: number) => Math.abs((((a - b) % 360) + 540) % 360 - 180);
  const m = lon(p.Moon);
  const r = lon(p.Rahu);
  return Math.min(diff(m, r), diff(m, (r + 180) % 360));
}

export const MOON_NODE_ORB = 6;

export interface DayRow {
  date: string;
  score: number;
  word: string;
  hours: string[];
  rahuKaal: string;
  note: string;
}

export function dayRows(grid: GridDay[], windows: NodalWindow[]): DayRow[] {
  return grid.map((d) => {
    const notes: string[] = [];
    const gap = moonNodeGap(d);
    if (gap !== null && gap <= MOON_NODE_ORB) notes.push('Moon crosses the Rahu–Ketu axis');
    const eclipse = windows.find((w) => w.kind === 'eclipse_season' && d.date >= w.start && d.date <= w.end);
    if (eclipse) notes.push('eclipse season');
    return { date: d.date, score: d.day_score, word: dayWord(d.day_score), hours: bestHours(d), rahuKaal: rahuKaalText(d), note: notes.join('; ') };
  });
}

export function dayTable(rows: DayRow[], caption: string): BlueprintTable {
  return {
    caption,
    head: ['Day', 'Feel', 'Best hours', 'Rahu Kaal', 'Note'],
    rows: rows.map((r) => [shortDate(r.date), `${r.word} (${r.score})`, r.hours.join(', ') || '–', r.rahuKaal || '–', r.note || '–']),
  };
}

/** Plain facts about a run of days: easiest, heaviest, and where the Moon crosses the nodes. */
export function dayFacts(rows: DayRow[], tag: string): BlueprintParagraph[] {
  if (rows.length === 0) return [];
  const sorted = [...rows].sort((a, b) => b.score - a.score);
  const top = sorted.slice(0, 3).map((r) => shortDate(r.date));
  const low = sorted.slice(-3).reverse().map((r) => shortDate(r.date));
  const nodes = rows.filter((r) => r.note.includes('Moon crosses')).map((r) => shortDate(r.date));
  const out: BlueprintParagraph[] = [
    {
      kind: 'fact',
      text: `Over these ${rows.length} days the engine scores ${top.join(', ')} highest and ${low.join(', ')} lowest. A low score means a slower, heavier day for demanding work, not a day to dread; the best hours listed for each day are the ones to put important conversations in.`,
      source_keys: [`${tag}.scores`],
    },
  ];
  if (nodes.length) {
    out.push({
      kind: 'fact',
      text: `The Moon crosses the Rahu–Ketu axis on ${nodes.join(', ')}. Traditionally these are days when feelings run closer to the surface; they are a good reason to keep plans simple, not to cancel them.`,
      source_keys: [`${tag}.moon_nodes`],
    });
  }
  return out;
}

/** Dates `from` to `to` inclusive, each as ISO. */
export function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}
