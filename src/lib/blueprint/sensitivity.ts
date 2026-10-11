/**
 * Birth-time sensitivity: how far the chart would move if the recorded time were wrong.
 *
 * With an exact time the question is only "how close is the rising degree to a sign edge?"
 * (the rising sign advances one degree about every four minutes). With an approximate time
 * the engine is re-run at ±1 and ±2 hours and the results compared: does the rising sign
 * change, does the Moon change pada, and by how many days do the dasha dates move?
 *
 * An unknown time makes no claim that needs the rising sign, and says so.
 */

import type { NatalChartData } from '@/lib/agents/types';
import { daysBetween } from '@/lib/personalization/eventDate';
import { isSign, type Sign } from '@/lib/funnel/reveal/astro';
import { dashaAt, GRAHAS, type Fact, type PlanetFact } from './facts';
import type { BlueprintParagraph } from './types';

export interface SensitivityVariant {
  offsetMin: number;
  chart: NatalChartData;
}

export interface TimeSensitivity {
  confidence: 'exact' | 'approx' | 'unknown';
  risingDegree: number | null;
  /** Minutes of error that would carry the rising degree over the nearest sign edge. */
  minutesToEdge: number | null;
  windowMinutes: number | null;
  risingSigns: Sign[];
  /** Signs the Moon could be in, given the range of birth times considered. */
  moonSigns: Sign[];
  moonNakshatras: string[];
  moonPadas: number[];
  /** Largest shift, in days, of the next dasha change across the variants. */
  nextChangeShiftDays: number | null;
  mahaEndShiftDays: number | null;
  /** Every planet that could rule the current major period across the birth times considered. */
  mahaPlanets: string[];
}

/** Same lookup as dashaAt but without needing planets: only dates are compared. */
function datesOf(chart: NatalChartData, today: string): { next: string | null; mahaEnd: string | null; maha: string | null } {
  const stub = Object.fromEntries(GRAHAS.map((g) => [g, { name: g, sign: 'Aries', house: 1, degree: 0, nakshatra: null, pada: null, retrograde: false, dignity: null, lon: 0 }])) as unknown as Record<(typeof GRAHAS)[number], PlanetFact>;
  const d = dashaAt(chart, today, stub, 'Aries');
  return { next: d?.nextChange ?? null, mahaEnd: d?.maha.end ?? null, maha: d?.maha.planet ?? null };
}

export function analyzeTimeSensitivity(
  base: NatalChartData,
  confidence: 'exact' | 'approx' | 'unknown',
  today: string,
  variants: SensitivityVariant[] = [],
): TimeSensitivity {
  const deg = Number(base.lagna_degree);
  const risingDegree = confidence !== 'unknown' && Number.isFinite(deg) ? deg : null;
  const minutesToEdge = risingDegree === null ? null : Math.round(Math.min(risingDegree, 30 - risingDegree) * 4);
  if (confidence === 'exact' || variants.length === 0) {
    const mp = base.planets?.Moon;
    return {
      confidence,
      risingDegree,
      minutesToEdge,
      windowMinutes: null,
      risingSigns: confidence !== 'unknown' && isSign(base.lagna) ? [base.lagna] : [],
      moonSigns: mp && isSign(mp.sign) ? [mp.sign] : [],
      moonNakshatras: [],
      moonPadas: [],
      nextChangeShiftDays: null,
      mahaEndShiftDays: null,
      mahaPlanets: [],
    };
  }

  const all = [{ offsetMin: 0, chart: base }, ...variants];
  const signs = new Set<Sign>();
  const moonSigns = new Set<Sign>();
  const naks = new Set<string>();
  const padas = new Set<number>();
  for (const v of all) {
    if (confidence !== 'unknown' && isSign(v.chart.lagna)) signs.add(v.chart.lagna);
    const m = v.chart.planets?.Moon;
    if (m && isSign(m.sign)) moonSigns.add(m.sign);
    if (m?.nakshatra) naks.add(m.nakshatra);
    if (typeof m?.nakshatra_pada === 'number') padas.add(m.nakshatra_pada);
  }
  const b = datesOf(base, today);
  const mahaPlanets = new Set<string>(b.maha ? [b.maha] : []);
  let nextShift = 0;
  let mahaShift = 0;
  for (const v of variants) {
    const d = datesOf(v.chart, today);
    if (d.maha) mahaPlanets.add(d.maha);
    if (b.next && d.next) nextShift = Math.max(nextShift, Math.abs(daysBetween(b.next, d.next)));
    if (b.mahaEnd && d.mahaEnd) mahaShift = Math.max(mahaShift, Math.abs(daysBetween(b.mahaEnd, d.mahaEnd)));
  }
  return {
    confidence,
    risingDegree,
    minutesToEdge,
    windowMinutes: Math.max(...variants.map((v) => Math.abs(v.offsetMin))),
    risingSigns: Array.from(signs),
    moonSigns: Array.from(moonSigns),
    moonNakshatras: Array.from(naks),
    moonPadas: Array.from(padas).sort(),
    nextChangeShiftDays: nextShift,
    mahaEndShiftDays: mahaShift,
    mahaPlanets: Array.from(mahaPlanets),
  };
}

const listOf = (xs: (string | number)[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** The sensitivity facts as keyed Facts (for source_keys) and as paragraphs for the snapshot. */
export function sensitivityParagraphs(s: TimeSensitivity): { facts: Fact[]; paragraphs: BlueprintParagraph[] } {
  const facts: Fact[] = [];
  const paragraphs: BlueprintParagraph[] = [];

  if (s.confidence === 'unknown') {
    facts.push({ key: 'time.unknown', text: 'The birth time is not known, so the chart was calculated for noon and houses are counted from the Moon.' });
    paragraphs.push({
      kind: 'limit',
      text: 'You told us your birth time is not known. The chart was calculated for noon, so the rising sign is left out and every house is counted from your Moon sign instead. Planet signs, nakshatras and the Rahu–Ketu signs hold either way; house positions and the dasha dates are provisional, and could shift by months if the real time differs.',
      source_keys: ['time.unknown'],
    });
    if (s.moonSigns.length > 1) {
      facts.push({ key: 'time.moon_sign', text: `The Moon changes sign during the birth day: it could be in ${listOf(s.moonSigns)}.` });
      paragraphs.push({
        kind: 'limit',
        text: `We also checked the whole of your birth day. Your Moon moves from ${s.moonSigns[s.moonSigns.length - 1]} into ${s.moonSigns[0]} (or the other way) during it, so it could be in ${listOf(s.moonSigns)} depending on the real time. Every house number below counts from ${s.moonSigns[0]}; if the Moon was in the other sign, every house shifts by one. This is the biggest thing a birth certificate would settle.`,
        source_keys: ['time.moon_sign'],
      });
    } else if (s.moonSigns.length === 1) {
      facts.push({ key: 'time.moon_sign', text: `The Moon stays in ${s.moonSigns[0]} through the whole birth day.` });
      paragraphs.push({
        kind: 'fact',
        text: `We checked the whole of your birth day: your Moon stays in ${s.moonSigns[0]} from midnight to midnight, so counting houses from it does not depend on the missing time.`,
        source_keys: ['time.moon_sign'],
      });
    }
    if (s.mahaPlanets.length > 1) {
      facts.push({ key: 'time.dasha', text: `Across the birth day the planet ruling the current major period could be ${listOf(s.mahaPlanets)}.` });
      paragraphs.push({
        kind: 'limit',
        text: `Dasha periods start from the Moon’s exact position, which depends on the birth time. Across your birth day the Moon moves into a different nakshatra, so the planet ruling your current major period could be ${listOf(s.mahaPlanets)}, not just one of them. The chapter section describes the noon version; treat every period date and every description of your current chapter as provisional until the time is known.`,
        source_keys: ['time.dasha'],
      });
    } else if (s.nextChangeShiftDays) {
      facts.push({ key: 'time.dasha', text: `Across the birth day the next dasha change moves by up to ${s.nextChangeShiftDays} days.` });
      paragraphs.push({
        kind: s.nextChangeShiftDays > 60 ? 'limit' : 'fact',
        text: `Dasha dates depend on the Moon’s exact degree, which depends on the birth time. Across your birth day the date your current sub-period ends could move by up to ${s.nextChangeShiftDays} days. Treat every period date in this report as accurate only to about that margin.`,
        source_keys: ['time.dasha'],
      });
    }
    return { facts, paragraphs };
  }

  if (s.confidence === 'exact') {
    if (s.minutesToEdge !== null) {
      const close = s.minutesToEdge <= 15;
      facts.push({ key: 'time.edge', text: `The rising degree is ${s.risingDegree?.toFixed(1)}°, about ${s.minutesToEdge} minutes from the nearest sign edge.` });
      paragraphs.push({
        kind: close ? 'limit' : 'fact',
        text: close
          ? `You gave an exact birth time, which helps. One caution: your rising degree (${s.risingDegree?.toFixed(1)}°) is only about ${s.minutesToEdge} minutes from a sign edge, so a recording error of that size would change your rising sign and every house. Birth times are often rounded to the nearest 5 or 15 minutes, so if yours came from memory or a rounded record, treat house-based statements as provisional.`
          : `You gave an exact birth time. Your rising degree (${s.risingDegree?.toFixed(1)}°) is about ${s.minutesToEdge} minutes from the nearest sign edge, so a small recording error would not change your rising sign.`,
        source_keys: ['time.edge'],
      });
    }
    return { facts, paragraphs };
  }

  // approximate
  const w = s.windowMinutes ?? 120;
  if (s.risingSigns.length === 0) return { facts, paragraphs };
  const stable = s.risingSigns.length === 1;
  facts.push({
    key: 'time.rising',
    text: stable
      ? `Across birth times up to ${w} minutes either side, the rising sign stays ${s.risingSigns[0]}.`
      : `Across birth times up to ${w} minutes either side, the rising sign could be ${listOf(s.risingSigns)}.`,
  });
  paragraphs.push({
    kind: 'fact',
    text: stable
      ? `You said your birth time is approximate, so we re-ran your chart at up to ${w} minutes either side of it. Your rising sign stays ${s.risingSigns[0]} across that whole range, which means the house-based readings below do not hinge on the exact minute.`
      : `You said your birth time is approximate, so we re-ran your chart at up to ${w} minutes either side of it. Your rising sign could be ${listOf(s.risingSigns)} depending on the real time. Every house number below assumes ${s.risingSigns[0]}, so read house-based statements as provisional until the time is confirmed from a certificate or a family record.`,
    source_keys: ['time.rising'],
  });
  if (s.mahaPlanets.length > 1) {
    facts.push({ key: 'time.dasha', text: `Across that range the planet ruling the current major period could be ${listOf(s.mahaPlanets)}.` });
    paragraphs.push({
      kind: 'limit',
      text: `Dasha periods start from the Moon’s exact position. Across that range the Moon crosses into a different nakshatra, so the planet ruling your current major period could be ${listOf(s.mahaPlanets)}. The chapter section describes the version for the time you gave; treat every period date as provisional until the time is confirmed.`,
      source_keys: ['time.dasha'],
    });
  } else if (s.nextChangeShiftDays) {
    facts.push({ key: 'time.dasha', text: `Across that range the next dasha change moves by up to ${s.nextChangeShiftDays} days.` });
    paragraphs.push({
      kind: s.nextChangeShiftDays > 60 ? 'limit' : 'fact',
      text: `Dasha dates depend on the Moon’s exact degree, which depends on the birth time. Across that range the date your current sub-period ends moves by up to ${s.nextChangeShiftDays} days. Treat every period date in this report as accurate to about that margin.`,
      source_keys: ['time.dasha'],
    });
  }
  if (s.moonPadas.length > 1) {
    facts.push({ key: 'time.moon', text: `The Moon’s pada could be ${listOf(s.moonPadas)} within that range.` });
    paragraphs.push({
      kind: 'fact',
      text: `Your Moon could fall in pada ${listOf(s.moonPadas)} of ${listOf(s.moonNakshatras)} within that range, so finer Moon readings are left out.`,
      source_keys: ['time.moon'],
    });
  }
  return { facts, paragraphs };
}
