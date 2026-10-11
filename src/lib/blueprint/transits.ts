/**
 * Karmic Blueprint, step 2: the next twelve months of Rahu–Ketu sensitivity.
 *
 * Built from the ephemeris engine's own sampled positions (weekly Sun and Rahu longitudes;
 * Ketu is always 180° from Rahu). Three kinds of window, each a calculation and nothing
 * else — what they MEAN is left to the narrative step:
 *
 *  - ingress         Rahu and Ketu change sign (the axis moves to a new pair of houses)
 *  - touch           Rahu or Ketu passes within 2° of one of your natal planets or your rising degree
 *  - eclipse_season  the Sun is within 15° of the Rahu–Ketu axis, the only time eclipses can occur
 *
 * The mean node moves almost perfectly steadily (about 0.053° a day, backwards), and the Sun
 * within a week by less than 0.05° of straight-line error, so daily values between weekly
 * samples are interpolated linearly. Pure: samples in, windows out.
 */

import { SIGNS, houseFrom, ordinal, type Sign } from '@/lib/funnel/reveal/astro';
import type { NodalWindow } from './types';
import { addDays, daysBetween } from '@/lib/personalization/eventDate';

export interface NodeSample {
  date: string;
  /** Sidereal longitude of Rahu, 0–360. */
  rahuLon: number;
  sunLon: number;
}

export interface NatalPoint {
  name: string;
  /** Sidereal longitude 0–360. */
  lon: number;
  /** Heavier points make heavier windows. */
  weight: number;
}

export const TOUCH_ORB_DEG = 2;
export const ECLIPSE_LIMIT_DEG = 15;

const norm = (x: number) => ((x % 360) + 360) % 360;
/** Signed shortest difference a − b in degrees, in (−180, 180]. */
const sdiff = (a: number, b: number) => ((((a - b) % 360) + 540) % 360) - 180;
const signOf = (lon: number): Sign => SIGNS[Math.floor(norm(lon) / 30) % 12];

export interface DayState {
  date: string;
  rahu: number;
  ketu: number;
  sun: number;
}

/** Daily node and Sun longitudes from weekly samples (linear in the shortest direction). */
export function interpolateDays(samples: NodeSample[]): DayState[] {
  const out: DayState[] = [];
  if (samples.length === 0) return out;
  const sorted = [...samples].sort((a, b) => a.date.localeCompare(b.date));
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    const span = daysBetween(a.date, b.date);
    if (span <= 0) continue;
    const dr = sdiff(b.rahuLon, a.rahuLon);
    const ds = sdiff(b.sunLon, a.sunLon);
    for (let d = 0; d < span; d++) {
      const rahu = norm(a.rahuLon + (dr * d) / span);
      out.push({ date: addDays(a.date, d), rahu, ketu: norm(rahu + 180), sun: norm(a.sunLon + (ds * d) / span) });
    }
  }
  const last = sorted[sorted.length - 1];
  out.push({ date: last.date, rahu: norm(last.rahuLon), ketu: norm(last.rahuLon + 180), sun: norm(last.sunLon) });
  return out;
}

interface Run {
  from: number;
  to: number;
  best: number;
}

/** Contiguous index runs where `f(i)` is a distance ≤ limit; `best` is the index of the minimum. */
function runsWhere(n: number, dist: (i: number) => number, limit: number): Run[] {
  const runs: Run[] = [];
  let cur: Run | null = null;
  for (let i = 0; i < n; i++) {
    const d = dist(i);
    if (d <= limit) {
      if (!cur) cur = { from: i, to: i, best: i };
      cur.to = i;
      if (d < dist(cur.best)) cur.best = i;
    } else if (cur) {
      runs.push(cur);
      cur = null;
    }
  }
  if (cur) runs.push(cur);
  return runs;
}

export interface WindowInput {
  samples: NodeSample[];
  natal: NatalPoint[];
  /** Sign the houses are counted from. */
  reference: Sign;
  /** Houses that read what the reader said matters most. */
  focusHouses: number[];
  /** First and last day to scan, inclusive. */
  from: string;
  to: string;
  /** Today, so a window that began earlier says it is already under way. */
  today?: string;
}

const ORDER_WEIGHT = { ingress: 80, touch: 0, eclipse_season: 50 } as const;

export function computeNodalWindows(input: WindowInput): NodalWindow[] {
  const days = interpolateDays(input.samples).filter((d) => d.date >= input.from && d.date <= input.to);
  if (days.length < 2) return [];
  const out: NodalWindow[] = [];
  const under = (start: string) => (input.today && start < input.today ? ' (already under way)' : '');
  const houseOf = (lon: number) => houseFrom(signOf(lon), input.reference);
  const axisAt = (i: number) => ({ r: houseOf(days[i].rahu), k: houseOf(days[i].ketu) });
  const focus = (r: number, k: number) => input.focusHouses.includes(r) || input.focusHouses.includes(k);

  // 1. Ingress: the day the node's sign changes.
  for (let i = 1; i < days.length; i++) {
    const before = signOf(days[i - 1].rahu);
    const after = signOf(days[i].rahu);
    if (before === after) continue;
    const a0 = axisAt(i - 1);
    const a1 = axisAt(i);
    const kBefore = signOf(days[i - 1].ketu);
    const kAfter = signOf(days[i].ketu);
    out.push({
      id: `ingress-${days[i].date}`,
      kind: 'ingress',
      start: addDays(days[i].date, -21),
      end: addDays(days[i].date, 21),
      peak: days[i].date,
      title: `Rahu enters ${after}, Ketu enters ${kAfter}`,
      fact: `On about ${days[i].date}, Rahu moves from ${before} into ${after} and Ketu from ${kBefore} into ${kAfter}. Your Rahu–Ketu axis shifts from your ${ordinal(a0.r)}–${ordinal(a0.k)} houses to your ${ordinal(a1.r)}–${ordinal(a1.k)}. The three weeks either side are the changeover.`,
      rahuHouse: a1.r,
      ketuHouse: a1.k,
      natal: null,
      weight: ORDER_WEIGHT.ingress + (focus(a1.r, a1.k) || focus(a0.r, a0.k) ? 15 : 0),
      onFocusHouse: focus(a1.r, a1.k) || focus(a0.r, a0.k),
      source_keys: [`transit.ingress=${days[i].date}`, `transit.rahu.sign=${after}`],
    });
  }

  // 2. Touch: a node within the orb of a natal point.
  for (const p of input.natal) {
    for (const node of ['rahu', 'ketu'] as const) {
      const runs = runsWhere(days.length, (i) => Math.abs(sdiff(days[i][node], p.lon)), TOUCH_ORB_DEG);
      for (const r of runs) {
        const a = axisAt(r.best);
        const start = days[r.from].date;
        const end = days[r.to].date;
        const peak = days[r.best].date;
        const nodeName = node === 'rahu' ? 'Rahu' : 'Ketu';
        const nodeSign = signOf(days[r.best][node]);
        // Natal Rahu is the one natal node we scan (natal Ketu is its mirror), so name the two cases plainly.
        const nodal = p.name === 'Rahu';
        const title = nodal
          ? node === 'rahu'
            ? 'Rahu returns to its birth position'
            : 'Ketu reaches your birth Rahu (the axis at its half-turn)'
          : `${nodeName} meets your ${p.name}`;
        const what = nodal ? `the position Rahu held when you were born` : `your natal ${p.name}`;
        out.push({
          id: `touch-${node}-${p.name}-${peak}`,
          kind: 'touch',
          start,
          end,
          peak,
          title,
          fact: `From ${start}${under(start)} to ${end}, ${nodeName} (in ${nodeSign}) passes within ${TOUCH_ORB_DEG}° of ${what}, closest on ${peak}. The axis is then across your ${ordinal(a.r)} and ${ordinal(a.k)} houses.`,
          rahuHouse: a.r,
          ketuHouse: a.k,
          natal: p.name,
          weight: p.weight + (focus(a.r, a.k) ? 15 : 0),
          onFocusHouse: focus(a.r, a.k),
          source_keys: [`transit.${node}.touch=${p.name}`, `natal.${p.name.toLowerCase()}.lon`],
        });
      }
    }
  }

  // 3. Eclipse seasons: the Sun near either node.
  const sunDist = (i: number) => Math.min(Math.abs(sdiff(days[i].sun, days[i].rahu)), Math.abs(sdiff(days[i].sun, days[i].ketu)));
  for (const r of runsWhere(days.length, sunDist, ECLIPSE_LIMIT_DEG)) {
    const a = axisAt(r.best);
    const start = days[r.from].date;
    const end = days[r.to].date;
    const peak = days[r.best].date;
    // A season clipped by the edge of the year is still shown, but says so.
    const clipped = r.from === 0 || r.to === days.length - 1;
    out.push({
      id: `eclipse-${peak}`,
      kind: 'eclipse_season',
      start,
      end,
      peak,
      title: 'Eclipse season',
      fact: `From ${start}${under(start)} to ${end}${clipped && r.to === days.length - 1 ? ' (continuing)' : ''}, the Sun is within ${ECLIPSE_LIMIT_DEG}° of the Rahu–Ketu axis, the only stretch in which eclipses can occur; it is closest on ${peak}. The axis is then across your ${ordinal(a.r)} and ${ordinal(a.k)} houses.`,
      rahuHouse: a.r,
      ketuHouse: a.k,
      natal: null,
      weight: ORDER_WEIGHT.eclipse_season + (focus(a.r, a.k) ? 20 : 0),
      onFocusHouse: focus(a.r, a.k),
      source_keys: [`transit.eclipse_season=${peak}`],
    });
  }

  return out.sort((x, y) => x.start.localeCompare(y.start) || y.weight - x.weight);
}

/** The windows worth printing: the heaviest `max`, always keeping every ingress, in date order. */
export function pickWindows(all: NodalWindow[], max = 7): NodalWindow[] {
  const must = all.filter((w) => w.kind === 'ingress');
  const rest = all.filter((w) => w.kind !== 'ingress').sort((a, b) => b.weight - a.weight);
  const chosen = [...must, ...rest.slice(0, Math.max(0, max - must.length))];
  return chosen.sort((a, b) => a.start.localeCompare(b.start));
}

/** Natal points the nodes can touch, with how much each matters. Rising degree only with a known time. */
export function natalPoints(
  planets: Record<string, { sign: Sign; degree: number }>,
  lagna: { sign: Sign; degree: number } | null,
): NatalPoint[] {
  // Natal Ketu is left out on purpose: transit Rahu on natal Ketu is transit Ketu on natal Rahu.
  const w: Record<string, number> = { Sun: 75, Moon: 75, Mars: 55, Mercury: 50, Jupiter: 55, Venus: 55, Saturn: 60, Rahu: 70 };
  const pts: NatalPoint[] = [];
  for (const [name, weight] of Object.entries(w)) {
    const p = planets[name];
    if (!p) continue;
    pts.push({ name, lon: SIGNS.indexOf(p.sign) * 30 + p.degree, weight });
  }
  if (lagna) pts.push({ name: 'rising degree', lon: SIGNS.indexOf(lagna.sign) * 30 + lagna.degree, weight: 75 });
  return pts;
}
