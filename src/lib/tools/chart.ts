import { z } from 'zod';
import type { NatalChartData } from '@/lib/agents/types';
import { detectDoshas } from '@/lib/kundli/doshas';
import { SIGNS } from '@/lib/kundli/varga';

const sign = z.string().refine(s => SIGNS.includes(s));
const degree = z.number().min(0).lt(30);
const planet = z.object({
  sign, degree, house: z.number().int().min(1).max(12),
  nakshatra: z.string().max(60).optional(),
  nakshatra_pada: z.number().int().min(1).max(4).optional(),
  is_retrograde: z.boolean().optional(),
});
const period = z.object({ planet: z.string().max(30), start_date: z.string().max(35), end_date: z.string().max(35) });
const currentDasha = z.object({ mahadasha: z.string().max(30), antardasha: z.string().max(30), start_date: z.string().max(35), end_date: z.string().max(35) });
export const natalSchema = z.object({
  lagna: sign.optional(), lagna_degree: degree.optional(),
  planets: z.record(z.string(), planet),
  moon_nakshatra: z.string().max(60).optional(),
  current_dasha: currentDasha.nullish(),
  dasha_sequence: z.array(period).max(100).optional(),
});

/**
 * The ephemeris returns `current_dasha: {}` when today falls outside the 120-year
 * Vimshottari window (any birth before roughly 1906, and some through the mid-1920s).
 * That is a finished timeline, not a broken chart. `nullish()` does not accept `{}`,
 * so leaving it in place rejects the lagna and planets as well.
 */
export function normalizeServiceNatal(input: unknown): unknown {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input;
  const source = input as Record<string, unknown>;
  const dasha = source.current_dasha;
  if (dasha && typeof dasha === 'object' && !Array.isArray(dasha) && Object.keys(dasha).length === 0) {
    return { ...source, current_dasha: null };
  }
  return input;
}

export const doshaSchema = z.object({
  present: z.boolean().nullable(),
  severity: z.string().max(30), from: z.array(z.string().max(40)).max(10), note: z.string().max(2000),
});
export type Dosha = z.infer<typeof doshaSchema>;
export const chartResultSchema = z.object({
  lagna: sign.nullable(), lagna_degree: degree.nullable(),
  sun_sign: sign.nullable(), moon_sign: sign.nullable(),
  moon_nakshatra: z.string().max(60).nullable(), moon_nakshatra_pada: z.number().int().min(1).max(4).nullable(),
  mars_house: z.number().int().min(1).max(12).nullable(), mars_sign: sign.nullable(),
  current_dasha: currentDasha.nullable(), dasha_sequence: z.array(period).max(100),
  doshas: z.object({ manglik: doshaSchema, kaalSarpa: doshaSchema, sadeSati: doshaSchema }),
  birth_time_accuracy: z.enum(['known', 'approximate']),
  calculated_at: z.string().datetime(),
});
export type ChartResult = z.infer<typeof chartResultSchema>;

function unavailable(note: string): Dosha {
  return { present: null, severity: 'unavailable', from: [], note };
}

export function doshaLabel(d: Dosha): string {
  return d.present === null ? 'Unavailable' : d.present ? 'Present' : 'Not indicated';
}

export function makeChartResult(raw: unknown, currentSaturnSign?: string, accuracy: 'known' | 'approximate' = 'known', now = new Date()): ChartResult {
  const data = natalSchema.parse(normalizeServiceNatal(raw));
  const chart = data as unknown as NatalChartData;
  const flags = detectDoshas(chart, { currentSaturnSign });
  const moon = data.planets.Moon;
  const mars = data.planets.Mars;
  const allPlanets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
  return {
    lagna: data.lagna ?? null, lagna_degree: data.lagna_degree ?? null,
    sun_sign: data.planets.Sun?.sign ?? null, moon_sign: moon?.sign ?? null,
    moon_nakshatra: moon?.nakshatra ?? data.moon_nakshatra ?? null,
    moon_nakshatra_pada: moon?.nakshatra_pada ?? null,
    mars_house: mars?.house ?? null, mars_sign: mars?.sign ?? null,
    current_dasha: data.current_dasha ?? null, dasha_sequence: data.dasha_sequence ?? [],
    doshas: {
      manglik: mars && moon && data.planets.Venus && data.lagna ? flags.manglik : unavailable('Required natal positions are missing. Manglik could not be assessed.'),
      kaalSarpa: allPlanets.every(p => data.planets[p]) ? flags.kaalSarpa : unavailable('Planet positions are incomplete. Kaal Sarpa could not be assessed.'),
      sadeSati: moon && currentSaturnSign && SIGNS.includes(currentSaturnSign) ? flags.sadeSati : unavailable('Live Saturn transit is unavailable. Sade Sati could not be assessed; this does not mean it is absent. Retry later.'),
    },
    birth_time_accuracy: accuracy, calculated_at: now.toISOString(),
  };
}
