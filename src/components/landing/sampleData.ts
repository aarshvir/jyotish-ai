/**
 * VERIFIED sample data for the public marketing samples (landing previews and /sample-report).
 *
 * Every value here comes from the deterministic ephemeris engine (Lahiri, whole-sign houses) for one
 * fixed, INVENTED sample birth, through src/components/landing/sampleForecast.ts. Regenerate with:
 *   npx tsx scripts/gen-sample-forecast.ts        (see the header of that script)
 *
 * Sample birth: 15 Jun 1992, 09:00, New Delhi -> Cancer rising (17.09 degrees), Moon in Scorpio, Jyeshtha.
 * Daily grid: Bangalore (current city), Tuesday 3 Nov 2026, the day of the sample reader's interview.
 *
 * History: an earlier version of this file was baked while the engine served the wrong ayanamsa
 * (Fagan-Bradley, 0.88 degrees off Lahiri). It put the Sun in Taurus (it is in Gemini), the Moon
 * period starting in Sep 2026 (it began in Aug 2025) and the lagna at 16.21 degrees. Deriving these
 * values from sampleForecast.ts, which the generator refuses to write unless the engine reports
 * Lahiri on its worker thread, keeps them from drifting apart again.
 */

import { computeAshtakoot, nakshatraNameToIndex } from '@/lib/synastry/ashtakoot';
import { SAMPLE_FORECAST } from './sampleForecast';

const CHART = SAMPLE_FORECAST.chart;
const moon = CHART.placements.find((p) => p.planet === 'Moon')!;
const sun = CHART.placements.find((p) => p.planet === 'Sun')!;
const EVENT_DAY = SAMPLE_FORECAST.days.find((d) => d.date === SAMPLE_FORECAST.event.date)!;

export const SAMPLE_SEEKER = {
  birthLabel: '15 Jun 1992 · 09:00 · New Delhi',
  currentCity: SAMPLE_FORECAST.window.city,
  sampleDayLabel: 'Tuesday 3 Nov · Bangalore',
  lagna: CHART.lagna,
  lagnaDegree: CHART.lagnaDegree,
  lagnaLord: 'Moon',
  moonSign: moon.sign,
  moonNakshatra: CHART.moonNakshatra,
  moonPada: CHART.moonPada,
  moonHouse: moon.house,
  sunSign: sun.sign,
  sunHouse: sun.house,
};

export interface DashaPeriod {
  lord: string;
  start: string; // ISO yyyy-mm-dd
  end: string;
  theme: string;
}

const DASHA_THEME: Record<string, string> = {
  Mercury: 'Early learning, intellect, communication',
  Ketu: 'Detachment, research, inward focus',
  Venus: 'Relationships, comfort, creativity, prosperity',
  Sun: 'Authority, recognition, clarity of self',
  Moon: 'Emotional life, public presence, nurture',
  Mars: 'Drive, courage, ambition, property',
  Rahu: 'Scale, foreign & unconventional gains',
  Jupiter: 'Wisdom, teaching, recognition, fortune',
  Saturn: 'Discipline, legacy, longevity',
};

/** Real Vimshottari mahadasha sequence for the sample birth (fixed for life). */
export const SAMPLE_DASHA: DashaPeriod[] = CHART.mahadashas.map((d) => ({
  lord: d.lord,
  start: d.start,
  end: d.end,
  theme: DASHA_THEME[d.lord] ?? '',
}));

/** Returns the index of the currently-active mahadasha for a given date (default: now). */
export function activeDashaIndex(periods: DashaPeriod[], at: Date = new Date()): number {
  const t = at.getTime();
  return periods.findIndex((p) => t >= Date.parse(p.start) && t < Date.parse(p.end));
}

export interface GridSlot {
  label: string; // "06:00–07:00"
  hora: string;
  chog: string;
  score: number;
}

/** Real 18-slot scored grid (Bangalore, the sample reader's interview day). */
export const SAMPLE_GRID: GridSlot[] = EVENT_DAY.slots.map((s) => ({
  label: s.label,
  hora: s.hora ?? '',
  chog: s.chog ?? '',
  score: s.score,
}));

export const SAMPLE_DAY_SCORE = EVENT_DAY.score;

// ── Deep Kundli sample (same fixed seeker, real 9-planet chart + real doshas) ──
export interface Placement { planet: string; sign: string; house: number; }

export const SAMPLE_KUNDLI = {
  placements: CHART.placements.map((p) => ({ planet: p.planet, sign: p.sign, house: p.house })) as Placement[],
  doshas: [
    { name: 'Manglik (Mangal Dosha)', status: 'Not present', good: true,
      detail: 'Mars sits in the 10th house in Aries (its own sign) — not in a Manglik house from the lagna.' },
    { name: 'Sade Sati', status: 'Not active', good: true,
      detail: 'Saturn is not transiting the 12th, 1st or 2nd sign from the natal Moon (Scorpio).' },
    { name: 'Kaal Sarp', status: 'Not present', good: true,
      detail: 'Planets fall on both sides of the Rahu–Ketu axis (6th–12th), so the chart is not fully hemmed.' },
  ],
} as const;

// ── Matchmaking / Gun Milan sample (real Ashtakoot for two real birth charts) ──
export interface Koota { name: string; max: number; score: number; note: string; }

/**
 * Scored by the product's own Ashtakoot code (src/lib/synastry/ashtakoot.ts) from the two Moons below, so the
 * landing preview cannot claim a number the product would not give. (An earlier hand-written version said 32/36
 * "Excellent"; the product's code gives 27.5/36 for these two Moons.) Only the Moon's sign and nakshatra enter
 * the score. Diya's Moon is in Dhanishta for a birth after about midday on that date.
 */
const MOON_A = { sign: 'Scorpio', signIndex: 7, nakshatra: 'Jyeshtha' };
const MOON_B = { sign: 'Capricorn', signIndex: 9, nakshatra: 'Dhanishta' };
const GUN_MILAN = computeAshtakoot({
  moonNakshatraIndexA: nakshatraNameToIndex(MOON_A.nakshatra),
  moonNakshatraIndexB: nakshatraNameToIndex(MOON_B.nakshatra),
  moonSignIndexA: MOON_A.signIndex,
  moonSignIndexB: MOON_B.signIndex,
});

/** Same bands as the free match on /synastry (src/app/api/synastry/teaser/route.ts). */
function matchBand(total: number): string {
  if (total >= 28) return 'Excellent match';
  if (total >= 21) return 'Strong match';
  if (total >= 18) return 'Workable match';
  return 'Needs conscious effort';
}

export const SAMPLE_SYNASTRY = {
  partnerA: { name: 'Aarav', detail: '15 Jun 1992 · New Delhi', moon: `${MOON_A.sign} · ${MOON_A.nakshatra}` },
  partnerB: { name: 'Diya', detail: '10 Feb 1994 · Mumbai', moon: `${MOON_B.sign} · ${MOON_B.nakshatra}` },
  total: GUN_MILAN.total,
  max: GUN_MILAN.max,
  verdict: matchBand(GUN_MILAN.total),
  breakdown: GUN_MILAN.breakdown as Koota[],
};
