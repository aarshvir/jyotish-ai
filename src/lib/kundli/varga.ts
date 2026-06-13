/**
 * Divisional (varga) charts for the deep Kundli engine.
 *
 * Pure, deterministic, side-effect-free functions. No network, no env reads.
 * All longitudes are sidereal absolute longitudes in [0, 360):
 *   absLongitude = signIndex * 30 + degreeWithinSign.
 *
 * Implemented divisions:
 *   D9  (Navamsa)  — overall destiny, marriage, dharma.
 *   D7  (Saptamsa) — children and progeny.
 *   D10 (Dasamsa)  — career, profession, public standing.
 *
 * The classical formulas below are the standard Parashari constructions used
 * by mainstream kundli software. They are verified against the canonical
 * anchor cases noted inline.
 */

import type { NatalChartData } from '@/lib/agents/types';

/** The twelve zodiac signs in canonical 0-based order (index 0 = Aries). */
export const SIGNS: string[] = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
];

/** The nine grahas tracked in a Vedic natal chart. */
const PLANET_KEYS: string[] = [
  'Sun',
  'Moon',
  'Mars',
  'Mercury',
  'Jupiter',
  'Venus',
  'Saturn',
  'Rahu',
  'Ketu',
];

/** Resolve a sign name to its 0-based index, or -1 if unknown. */
export function signIndexOf(sign: string): number {
  return SIGNS.indexOf(sign);
}

/**
 * Absolute sidereal longitude for a planet given its sign name and the degree
 * (0–30) within that sign. Returns a value in [0, 360). Unknown signs map their
 * sign contribution to 0 so the function never throws.
 */
export function absLongitude(sign: string, degree: number): number {
  const idx = SIGNS.indexOf(sign);
  const base = idx >= 0 ? idx * 30 : 0;
  const deg = Number.isFinite(degree) ? degree : 0;
  return ((base + deg) % 360 + 360) % 360;
}

/**
 * D9 / Navamsa sign index (0-based) from an absolute longitude.
 *
 * Continuous formula: each navamsa spans 3°20' (= 30/9 degrees). The navamsa
 * index increments continuously across the whole zodiac and wraps mod 12.
 *
 * Verified anchors:
 *   Aries 0°  (0)   -> 0  (Aries)     — movable sign starts from itself.
 *   Taurus 0° (30)  -> 9  (Capricorn) — fixed sign starts from the 9th.
 *   Gemini 0° (60)  -> 6  (Libra)     — dual sign starts from the 5th.
 */
export function navamsaSignIndex(absLon: number): number {
  const lon = ((absLon % 360) + 360) % 360;
  return Math.floor(lon / (30 / 9)) % 12;
}

/**
 * D7 / Saptamsa sign index (0-based) — progeny chart.
 *
 * Each saptamsa spans 30/7 degrees (≈4°17'08"). For odd signs (1-based:
 * Aries, Gemini, ...; equivalently 0-based signIndex even) counting starts
 * from the same sign; for even signs it starts from the 7th sign from it.
 */
export function saptamsaSignIndex(absLon: number): number {
  const lon = ((absLon % 360) + 360) % 360;
  const signIndex = Math.floor(lon / 30);
  const within = lon % 30;
  const part = Math.min(6, Math.floor(within / (30 / 7))); // 0..6
  const isOddSign = signIndex % 2 === 0; // 0-based even => 1-based odd
  const start = isOddSign ? signIndex : signIndex + 6;
  return (start + part) % 12;
}

/**
 * D10 / Dasamsa sign index (0-based) — career and profession chart.
 *
 * Each dasamsa spans 3 degrees. For odd signs (0-based signIndex even) counting
 * starts from the same sign; for even signs it starts from the 9th sign from it
 * (i.e. an offset of 8 in 0-based indexing).
 */
export function dasamsaSignIndex(absLon: number): number {
  const lon = ((absLon % 360) + 360) % 360;
  const signIndex = Math.floor(lon / 30);
  const within = lon % 30;
  const part = Math.min(9, Math.floor(within / 3)); // 0..9
  const isOddSign = signIndex % 2 === 0;
  const start = isOddSign ? signIndex : signIndex + 8;
  return (start + part) % 12;
}

/** Convenience: divisional sign NAME helpers. */
export function navamsaSign(absLon: number): string {
  return SIGNS[navamsaSignIndex(absLon)];
}
export function saptamsaSign(absLon: number): string {
  return SIGNS[saptamsaSignIndex(absLon)];
}
export function dasamsaSign(absLon: number): string {
  return SIGNS[dasamsaSignIndex(absLon)];
}

/**
 * A planet considered "dignified" in a sign if it sits in its own sign or its
 * exaltation sign. Used only to phrase the human-readable navamsaNote; this is
 * a deliberately conservative, generic check (no debilitation shaming).
 */
const OWN_SIGNS: Record<string, string[]> = {
  Sun: ['Leo'],
  Moon: ['Cancer'],
  Mars: ['Aries', 'Scorpio'],
  Mercury: ['Gemini', 'Virgo'],
  Jupiter: ['Sagittarius', 'Pisces'],
  Venus: ['Taurus', 'Libra'],
  Saturn: ['Capricorn', 'Aquarius'],
};

const EXALTATION_SIGNS: Record<string, string> = {
  Sun: 'Aries',
  Moon: 'Taurus',
  Mars: 'Capricorn',
  Mercury: 'Virgo',
  Jupiter: 'Cancer',
  Venus: 'Pisces',
  Saturn: 'Libra',
};

function isDignified(planet: string, sign: string): boolean {
  if ((OWN_SIGNS[planet] ?? []).includes(sign)) return true;
  if (EXALTATION_SIGNS[planet] === sign) return true;
  return false;
}

/** Divisional-chart bundle for the nine planets plus the Navamsa lagna. */
export interface VargaChart {
  /** Navamsa (D9) sign NAME for each planet, keyed by planet name. */
  d9: Record<string, string>;
  /** Navamsa sign NAME on which the Lagna degree falls. */
  d9Lagna: string;
  /** Saptamsa (D7) sign NAME for each planet. */
  d7: Record<string, string>;
  /** Dasamsa (D10) sign NAME for each planet. */
  d10: Record<string, string>;
  /** One-line plain-English note on Navamsa dignity of key planets. */
  navamsaNote: string;
}

/**
 * Compute the D9, D7 and D10 sign placements for all nine planets plus the
 * Navamsa sign of the Lagna. Pure: depends only on the supplied chart.
 */
export function computeVargas(chart: NatalChartData): VargaChart {
  const d9: Record<string, string> = {};
  const d7: Record<string, string> = {};
  const d10: Record<string, string> = {};

  for (const key of PLANET_KEYS) {
    const p = chart.planets?.[key];
    if (!p) continue;
    const lon = absLongitude(p.sign, p.degree);
    d9[key] = navamsaSign(lon);
    d7[key] = saptamsaSign(lon);
    d10[key] = dasamsaSign(lon);
  }

  const lagnaLon = absLongitude(chart.lagna, chart.lagna_degree ?? 0);
  const d9Lagna = navamsaSign(lagnaLon);

  // Build a conservative, supportive Navamsa note from Moon, Venus and the
  // lagna-lord region (proxied here by the Navamsa lagna sign).
  const venusD9 = d9['Venus'];
  const moonD9 = d9['Moon'];
  const venusStrong = venusD9 ? isDignified('Venus', venusD9) : false;
  const moonStrong = moonD9 ? isDignified('Moon', moonD9) : false;

  let navamsaNote: string;
  if (venusStrong && moonStrong) {
    navamsaNote =
      'Both Venus and the Moon settle into strong ground in the Navamsa, a reassuring marker for warmth in marriage and emotional steadiness.';
  } else if (venusStrong) {
    navamsaNote =
      'Venus holds steady in the Navamsa, a positive marker for the depth and longevity of partnership.';
  } else if (moonStrong) {
    navamsaNote =
      'The Moon finds firm footing in the Navamsa, supporting emotional resilience and a settled inner life.';
  } else if (venusD9) {
    navamsaNote = `In the Navamsa the marriage indicator Venus moves into ${venusD9}, colouring partnership with that sign's qualities; the chart rewards conscious nurturing of the bond.`;
  } else {
    navamsaNote =
      'The Navamsa adds depth to the birth chart, fine-tuning how relationships and inner commitments mature over time.';
  }

  return { d9, d9Lagna, d7, d10, navamsaNote };
}
