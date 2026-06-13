/**
 * Deterministic dosha detection for the deep Kundli engine.
 *
 * Pure functions (one optional argument carries the live Saturn transit).
 * No network, no env reads. Notes are written in plain, compassionate,
 * non-fatalistic English because these flags genuinely worry people — a dosha
 * is a pattern to work with, never a sentence.
 */

import type { NatalChartData } from '@/lib/agents/types';
import { SIGNS, absLongitude, signIndexOf } from './varga';

export type DoshaSeverity = 'none' | 'mild' | 'moderate' | 'strong';

export interface DoshaFlag {
  present: boolean;
  severity: DoshaSeverity;
  /** Reference points that triggered the flag, e.g. ['Lagna','Moon']. */
  from: string[];
  note: string;
}

export interface DoshaReport {
  manglik: DoshaFlag;
  kaalSarpa: DoshaFlag;
  sadeSati: DoshaFlag;
}

/** Houses that activate Mangal Dosha (counted from a reference point). */
const MANGLIK_HOUSES = new Set([1, 2, 4, 7, 8, 12]);

/** Mars is comfortable (own sign / exaltation) in these signs → partial cancel. */
const MARS_COMFORT_SIGNS = new Set(['Aries', 'Scorpio', 'Capricorn']);

/** Lower a severity by one notch (used for partial cancellation). */
function downgrade(sev: DoshaSeverity): DoshaSeverity {
  if (sev === 'strong') return 'moderate';
  if (sev === 'moderate') return 'mild';
  if (sev === 'mild') return 'none';
  return 'none';
}

/**
 * House number (1–12) of a planet's sign counted FROM a reference sign.
 * Whole-sign counting: the reference sign itself is house 1.
 */
function houseFromSign(planetSignIdx: number, refSignIdx: number): number {
  return ((planetSignIdx - refSignIdx + 12) % 12) + 1;
}

function detectManglik(chart: NatalChartData): DoshaFlag {
  const mars = chart.planets?.['Mars'];
  if (!mars) {
    return {
      present: false,
      severity: 'none',
      from: [],
      note: 'Mars position unavailable, so Mangal Dosha could not be assessed.',
    };
  }

  const marsSignIdx = signIndexOf(mars.sign);
  const moon = chart.planets?.['Moon'];
  const venus = chart.planets?.['Venus'];

  const from: string[] = [];

  // From the Lagna we trust the engine-provided house number directly.
  const fromLagna = MANGLIK_HOUSES.has(mars.house);
  if (fromLagna) from.push('Lagna');

  // From the Moon sign and Venus sign, derive Mars's house by whole-sign count.
  let fromMoon = false;
  if (moon && marsSignIdx >= 0) {
    const moonIdx = signIndexOf(moon.sign);
    if (moonIdx >= 0 && MANGLIK_HOUSES.has(houseFromSign(marsSignIdx, moonIdx))) {
      fromMoon = true;
      from.push('Moon');
    }
  }
  let fromVenus = false;
  if (venus && marsSignIdx >= 0) {
    const venusIdx = signIndexOf(venus.sign);
    if (venusIdx >= 0 && MANGLIK_HOUSES.has(houseFromSign(marsSignIdx, venusIdx))) {
      fromVenus = true;
      from.push('Venus');
    }
  }

  const present = fromLagna || fromMoon || fromVenus;
  if (!present) {
    return {
      present: false,
      severity: 'none',
      from: [],
      note: 'No Mangal Dosha is indicated — Mars does not fall in the sensitive houses from the Ascendant, Moon, or Venus.',
    };
  }

  // Base severity.
  let severity: DoshaSeverity;
  if (fromLagna && (fromMoon || fromVenus)) severity = 'strong';
  else if (fromLagna) severity = 'moderate';
  else severity = 'mild';

  // The 7th and 8th placements are traditionally the heaviest.
  const heavyHouse = fromLagna && (mars.house === 7 || mars.house === 8);

  // Partial cancellation when Mars sits in its own or exaltation sign.
  const comfort = MARS_COMFORT_SIGNS.has(mars.sign);
  if (comfort) severity = downgrade(severity);

  const refsText = from.join(' and ');
  let note =
    severity === 'strong'
      ? `A pronounced Mangal influence shows up from the ${refsText}. In practical terms this tends to add intensity and a need for patience in close partnerships.`
      : severity === 'moderate'
        ? `A moderate Mangal influence appears from the ${refsText}, asking for a little extra patience and honesty in relationships.`
        : severity === 'mild'
          ? `Only a mild Mangal influence is seen (from the ${refsText}); its effect is gentle and easily balanced.`
          : `Any Mangal influence here is effectively neutralised.`;

  if (heavyHouse) {
    note += ` Mars sits in the ${mars.house}th house from the Ascendant, the placement classical texts weigh most heavily, so conscious communication around marriage is worthwhile.`;
  }
  if (comfort) {
    note += ` Because Mars rests in ${mars.sign}, one of its comfortable signs, much of the intensity is softened — a recognised partial cancellation.`;
  }
  note += ` This is a pattern to work with thoughtfully, not a verdict; many fulfilling marriages carry it.`;

  return { present: true, severity, from, note };
}

function detectKaalSarpa(chart: NatalChartData): DoshaFlag {
  const rahu = chart.planets?.['Rahu'];
  const ketu = chart.planets?.['Ketu'];
  if (!rahu || !ketu) {
    return {
      present: false,
      severity: 'none',
      from: [],
      note: 'Rahu/Ketu positions unavailable, so Kaal Sarpa could not be assessed.',
    };
  }

  const rahuLon = absLongitude(rahu.sign, rahu.degree);
  const others = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

  let allWithin = true;
  let onAxis = false;
  for (const key of others) {
    const p = chart.planets?.[key];
    if (!p) {
      allWithin = false;
      break;
    }
    const lon = absLongitude(p.sign, p.degree);
    const rel = ((lon - rahuLon) % 360 + 360) % 360; // 0..360 forward from Rahu
    if (rel > 180) {
      allWithin = false;
      break;
    }
    if (rel === 0 || rel === 180) onAxis = true;
  }

  if (!allWithin) {
    return {
      present: false,
      severity: 'none',
      from: [],
      note: 'No Kaal Sarpa pattern — the planets are spread on both sides of the Rahu–Ketu axis, which keeps the chart balanced.',
    };
  }

  const severity: DoshaSeverity = onAxis ? 'strong' : 'moderate';
  const note =
    `All seven classical planets fall on one side of the Rahu–Ketu axis, forming a Kaal Sarpa pattern. ` +
    `In everyday terms it can make life feel concentrated in waves — periods of intense focus followed by release — and it often rewards persistence and a clear sense of purpose. ` +
    (onAxis
      ? `One planet sits right on the axis, which sharpens the effect. `
      : ``) +
    `It is widely shared and far from a barrier to a full, successful life.`;

  return { present: true, severity, from: ['Rahu–Ketu axis'], note };
}

function detectSadeSati(chart: NatalChartData, currentSaturnSign?: string): DoshaFlag {
  const moon = chart.planets?.['Moon'];
  const moonSign = moon?.sign;

  if (!currentSaturnSign) {
    return {
      present: false,
      severity: 'none',
      from: [],
      note: 'Current Saturn transit not supplied — Sade Sati status pending live transit.',
    };
  }
  if (!moonSign) {
    return {
      present: false,
      severity: 'none',
      from: [],
      note: 'Moon sign unavailable, so Sade Sati could not be assessed.',
    };
  }

  const moonIdx = signIndexOf(moonSign);
  const satIdx = signIndexOf(currentSaturnSign);
  if (moonIdx < 0 || satIdx < 0) {
    return {
      present: false,
      severity: 'none',
      from: [],
      note: 'Sign names could not be matched, so Sade Sati could not be assessed.',
    };
  }

  // House of transiting Saturn from the natal Moon (whole-sign; Moon = 1).
  const houseFromMoon = houseFromSign(satIdx, moonIdx);

  let phase: 'rising' | 'peak' | 'setting' | null = null;
  if (houseFromMoon === 12) phase = 'rising';
  else if (houseFromMoon === 1) phase = 'peak';
  else if (houseFromMoon === 2) phase = 'setting';

  if (!phase) {
    return {
      present: false,
      severity: 'none',
      from: [],
      note: `Saturn is currently in ${currentSaturnSign}, away from your Moon sign (${moonSign}), so you are not in a Sade Sati phase right now.`,
    };
  }

  const severity: DoshaSeverity = phase === 'peak' ? 'strong' : 'moderate';
  const phaseWord =
    phase === 'rising'
      ? 'the opening (rising) phase'
      : phase === 'peak'
        ? 'the central (peak) phase'
        : 'the closing (setting) phase';

  const note =
    `Saturn is transiting ${currentSaturnSign}, placing you in ${phaseWord} of Sade Sati relative to your Moon sign (${moonSign}). ` +
    `This roughly seven-and-a-half-year cycle is best understood as a season of maturing — it asks for patience, realistic planning, and care for rest and health. ` +
    `Many people emerge from it noticeably stronger and clearer about what matters. It is demanding, not punishing.`;

  return { present: true, severity, from: ['Moon'], note };
}

/**
 * Detect the three doshas most people ask about. Sade Sati needs the live
 * Saturn sign; pass it via `opts.currentSaturnSign`. Everything else is derived
 * purely from the natal chart.
 */
export function detectDoshas(
  chart: NatalChartData,
  opts?: { currentSaturnSign?: string },
): DoshaReport {
  // Guard against an unexpected currentSaturnSign that is not a real sign name.
  const rawSat = opts?.currentSaturnSign?.trim();
  const currentSaturnSign = rawSat && SIGNS.includes(rawSat) ? rawSat : undefined;

  return {
    manglik: detectManglik(chart),
    kaalSarpa: detectKaalSarpa(chart),
    sadeSati: detectSadeSati(chart, currentSaturnSign),
  };
}
