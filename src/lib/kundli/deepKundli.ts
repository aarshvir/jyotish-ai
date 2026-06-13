/**
 * Assembles a single, structured, deterministic data bundle for the deep Kundli
 * report. This is the factual spine the commentary layer reasons FROM — it never
 * invents positions; it only derives them from the supplied natal chart.
 *
 * Pure (one optional argument for the live Saturn sign). No network, no env.
 */

import type { NatalChartData } from '@/lib/agents/types';
import { SIGNS, signIndexOf, type VargaChart, computeVargas } from './varga';
import { detectDoshas, type DoshaReport } from './doshas';

/** Sign → ruling planet (classical lordships). */
const SIGN_LORD: Record<string, string> = {
  Aries: 'Mars',
  Taurus: 'Venus',
  Gemini: 'Mercury',
  Cancer: 'Moon',
  Leo: 'Sun',
  Virgo: 'Mercury',
  Libra: 'Venus',
  Scorpio: 'Mars',
  Sagittarius: 'Jupiter',
  Capricorn: 'Saturn',
  Aquarius: 'Saturn',
  Pisces: 'Jupiter',
};

/** Natural benefics / malefics for the simple year-dignity heuristic. */
const BENEFIC = new Set(['Jupiter', 'Venus', 'Mercury', 'Moon']);
const MALEFIC = new Set(['Saturn', 'Mars', 'Rahu', 'Ketu', 'Sun']);

export type HeadlineDignity = 'supportive' | 'mixed' | 'testing';

export interface YearOutlookSeed {
  year: number;
  mahadasha: string;
  antardashas: string[];
  headlineDignity: HeadlineDignity;
}

export interface HouseHighlight {
  house: number;
  sign: string;
  occupants: string[];
}

export interface DeepKundliData {
  lagna: string;
  lagnaLord: string;
  moonSign: string;
  moonNakshatra: string;
  sunSign: string;
  houseHighlights: HouseHighlight[];
  vargas: VargaChart;
  doshas: DoshaReport;
  fiveYear: YearOutlookSeed[];
}

/** Look up the lord of a sign; falls back to '' for unknown names. */
export function lordOfSign(sign: string): string {
  return SIGN_LORD[sign] ?? '';
}

/** Parse a YYYY-MM-DD (or ISO) date string into a Date, or null if invalid. */
function parseDate(s: string | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Does [aStart,aEnd] overlap [bStart,bEnd]? Inclusive, null-safe. */
function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

/** Classify a set of ruling antardasha planets into one headline dignity. */
function dignityFor(planets: string[]): HeadlineDignity {
  const uniq = Array.from(new Set(planets.filter(Boolean)));
  if (uniq.length === 0) return 'mixed';
  const benefics = uniq.filter((p) => BENEFIC.has(p)).length;
  const malefics = uniq.filter((p) => MALEFIC.has(p)).length;
  if (benefics > 0 && malefics === 0) return 'supportive';
  if (malefics > 0 && benefics === 0) return 'testing';
  return 'mixed';
}

/**
 * Build the five-year outlook seeds (current year .. +4). For each calendar
 * year we find every mahadasha/antardasha that overlaps that year by date.
 */
function buildFiveYear(chart: NatalChartData, currentYear: number): YearOutlookSeed[] {
  const seq = Array.isArray(chart.dasha_sequence) ? chart.dasha_sequence : [];
  const seeds: YearOutlookSeed[] = [];

  for (let i = 0; i < 5; i++) {
    const year = currentYear + i;
    const yStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
    const yEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59));

    const mahadashas: string[] = [];
    const antardashas: string[] = [];

    for (const md of seq) {
      const mdStart = parseDate(md.start_date);
      const mdEnd = parseDate(md.end_date);
      if (!mdStart || !mdEnd) continue;
      if (!rangesOverlap(mdStart, mdEnd, yStart, yEnd)) continue;

      if (md.planet && !mahadashas.includes(md.planet)) mahadashas.push(md.planet);

      const ads = Array.isArray(md.antardasha) ? md.antardasha : [];
      for (const ad of ads) {
        const adStart = parseDate(ad.start_date);
        const adEnd = parseDate(ad.end_date);
        if (!adStart || !adEnd) continue;
        if (rangesOverlap(adStart, adEnd, yStart, yEnd) && ad.planet) {
          if (!antardashas.includes(ad.planet)) antardashas.push(ad.planet);
        }
      }
    }

    // Fall back to the current_dasha if the sequence yielded nothing for an
    // overlapping early year (keeps the seed populated and specific).
    if (mahadashas.length === 0 && chart.current_dasha?.mahadasha) {
      const cdStart = parseDate(chart.current_dasha.start_date);
      const cdEnd = parseDate(chart.current_dasha.end_date);
      if (cdStart && cdEnd && rangesOverlap(cdStart, cdEnd, yStart, yEnd)) {
        mahadashas.push(chart.current_dasha.mahadasha);
        if (chart.current_dasha.antardasha) antardashas.push(chart.current_dasha.antardasha);
      }
    }

    const mahadasha = mahadashas.join(' → ') || 'Unknown';
    // Dignity reasons from the ruling antardasha planet(s); if none, use the MD.
    const dignityInputs = antardashas.length > 0 ? antardashas : mahadashas;
    const headlineDignity = dignityFor(dignityInputs);

    seeds.push({ year, mahadasha, antardashas, headlineDignity });
  }

  return seeds;
}

/**
 * Build the whole-sign house highlights (houses 1..12 from the Lagna). The sign
 * on each house is fixed by the Lagna; occupants come from each planet's house.
 */
function buildHouseHighlights(chart: NatalChartData): HouseHighlight[] {
  const lagnaIdx = signIndexOf(chart.lagna);
  const planets = chart.planets ?? {};

  // Group occupants by house number reported on each planet.
  const byHouse: Record<number, string[]> = {};
  for (const [name, p] of Object.entries(planets)) {
    if (!p) continue;
    const h = p.house;
    if (typeof h === 'number' && h >= 1 && h <= 12) {
      (byHouse[h] ??= []).push(name);
    }
  }

  const out: HouseHighlight[] = [];
  for (let house = 1; house <= 12; house++) {
    const signIdx = lagnaIdx >= 0 ? (lagnaIdx + house - 1) % 12 : -1;
    const sign = signIdx >= 0 ? SIGNS[signIdx] : '';
    out.push({ house, sign, occupants: byHouse[house] ?? [] });
  }
  return out;
}

/**
 * Build the full deterministic Kundli data bundle. `opts.currentSaturnSign`
 * (a sign name) enables live Sade Sati detection; everything else is derived
 * purely from the natal chart.
 */
export function buildDeepKundli(
  chart: NatalChartData,
  opts?: { currentSaturnSign?: string },
): DeepKundliData {
  const lagna = chart.lagna;
  const lagnaLord = lordOfSign(lagna);
  const moon = chart.planets?.['Moon'];
  const sun = chart.planets?.['Sun'];

  const vargas = computeVargas(chart);
  const doshas = detectDoshas(chart, opts);
  const currentYear = new Date().getFullYear();
  const fiveYear = buildFiveYear(chart, currentYear);
  const houseHighlights = buildHouseHighlights(chart);

  return {
    lagna,
    lagnaLord,
    moonSign: moon?.sign ?? '',
    moonNakshatra: chart.moon_nakshatra ?? moon?.nakshatra ?? '',
    sunSign: sun?.sign ?? '',
    houseHighlights,
    vargas,
    doshas,
    fiveYear,
  };
}
