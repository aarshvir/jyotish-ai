/**
 * VERIFIED sample data for the public marketing samples.
 *
 * Every value here is REAL output from the deterministic ephemeris engine
 * (Railway) for one fixed sample birth — not invented. Regenerate with:
 *   node scripts/gen-sample-data.mjs
 *
 * Sample seeker: 15 Jun 1992, 09:00, New Delhi → Cancer lagna (16.21°).
 * Daily grid: Bangalore (current city), sample day Mon 15 Jun 2026.
 */

export const SAMPLE_SEEKER = {
  birthLabel: '15 Jun 1992 · 09:00 · New Delhi',
  currentCity: 'Bangalore',
  sampleDayLabel: 'Monday · Bangalore',
  lagna: 'Cancer',
  lagnaDegree: 16.21,
  lagnaLord: 'Moon',
  moonSign: 'Scorpio',
  moonNakshatra: 'Jyeshtha',
  moonPada: 4,
  moonHouse: 5,
  sunSign: 'Taurus',
  sunHouse: 11,
} as const;

export interface DashaPeriod {
  lord: string;
  start: string; // ISO yyyy-mm-dd
  end: string;
  theme: string;
}

/** Real Vimshottari mahadasha sequence for the sample birth (fixed for life). */
export const SAMPLE_DASHA: DashaPeriod[] = [
  { lord: 'Mercury', start: '1976-09-18', end: '1993-09-18', theme: 'Early learning, intellect, communication' },
  { lord: 'Ketu', start: '1993-09-18', end: '2000-09-18', theme: 'Detachment, research, inward focus' },
  { lord: 'Venus', start: '2000-09-18', end: '2020-09-18', theme: 'Relationships, comfort, creativity, prosperity' },
  { lord: 'Sun', start: '2020-09-18', end: '2026-09-18', theme: 'Authority, recognition, clarity of self' },
  { lord: 'Moon', start: '2026-09-18', end: '2036-09-18', theme: 'Emotional life, public presence, nurture' },
  { lord: 'Mars', start: '2036-09-18', end: '2043-09-19', theme: 'Drive, courage, ambition, property' },
  { lord: 'Rahu', start: '2043-09-19', end: '2061-09-18', theme: 'Scale, foreign & unconventional gains' },
  { lord: 'Jupiter', start: '2061-09-18', end: '2077-09-18', theme: 'Wisdom, teaching, recognition, fortune' },
  { lord: 'Saturn', start: '2077-09-18', end: '2096-09-18', theme: 'Discipline, legacy, longevity' },
];

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

/** Real 18-slot scored grid (Bangalore, sample day). day_score = 70. */
export const SAMPLE_GRID: GridSlot[] = [
  { label: '06:00–07:00', hora: 'Moon', chog: 'Amrit', score: 84 },
  { label: '07:00–08:00', hora: 'Saturn', chog: 'Amrit', score: 56 },
  { label: '08:00–09:00', hora: 'Jupiter', chog: 'Kaal', score: 63 },
  { label: '09:00–10:00', hora: 'Mars', chog: 'Shubh', score: 94 },
  { label: '10:00–11:00', hora: 'Sun', chog: 'Shubh', score: 75 },
  { label: '11:00–12:00', hora: 'Venus', chog: 'Rog', score: 59 },
  { label: '12:00–13:00', hora: 'Mercury', chog: 'Udveg', score: 49 },
  { label: '13:00–14:00', hora: 'Moon', chog: 'Udveg', score: 71 },
  { label: '14:00–15:00', hora: 'Saturn', chog: 'Chal', score: 50 },
  { label: '15:00–16:00', hora: 'Saturn', chog: 'Chal', score: 50 },
  { label: '16:00–17:00', hora: 'Jupiter', chog: 'Labh', score: 92 },
  { label: '17:00–18:00', hora: 'Mars', chog: 'Amrit', score: 98 },
  { label: '18:00–19:00', hora: 'Sun', chog: 'Amrit', score: 83 },
  { label: '19:00–20:00', hora: 'Venus', chog: 'Kaal', score: 49 },
  { label: '20:00–21:00', hora: 'Mercury', chog: 'Shubh', score: 57 },
  { label: '21:00–22:00', hora: 'Moon', chog: 'Shubh', score: 82 },
  { label: '22:00–23:00', hora: 'Jupiter', chog: 'Rog', score: 76 },
  { label: '23:00–24:00', hora: 'Mars', chog: 'Udveg', score: 72 },
];

export const SAMPLE_DAY_SCORE = 70;

// ── Deep Kundli sample (same fixed seeker, real 9-planet chart + real doshas) ──
export interface Placement { planet: string; sign: string; house: number; }

export const SAMPLE_KUNDLI = {
  placements: [
    { planet: 'Sun', sign: 'Taurus', house: 11 },
    { planet: 'Moon', sign: 'Scorpio', house: 5 },
    { planet: 'Mars', sign: 'Aries', house: 10 },
    { planet: 'Mercury', sign: 'Gemini', house: 12 },
    { planet: 'Jupiter', sign: 'Leo', house: 2 },
    { planet: 'Venus', sign: 'Gemini', house: 12 },
    { planet: 'Saturn', sign: 'Capricorn', house: 7 },
    { planet: 'Rahu', sign: 'Sagittarius', house: 6 },
    { planet: 'Ketu', sign: 'Gemini', house: 12 },
  ] as Placement[],
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

export const SAMPLE_SYNASTRY = {
  partnerA: { name: 'Aarav', detail: '15 Jun 1992 · New Delhi', moon: 'Scorpio · Jyeshtha' },
  partnerB: { name: 'Diya', detail: '10 Feb 1994 · Mumbai', moon: 'Capricorn · Dhanishta' },
  total: 32,
  max: 36,
  verdict: 'Excellent match',
  breakdown: [
    { name: 'Varna', max: 1, score: 1, note: 'Temperament class compatible' },
    { name: 'Vashya', max: 2, score: 2, note: 'Natural mutual influence' },
    { name: 'Tara', max: 3, score: 3, note: 'Birth-star fortune aligned' },
    { name: 'Yoni', max: 4, score: 0, note: 'Different instinctive natures' },
    { name: 'Graha Maitri', max: 5, score: 5, note: 'Strong mental friendship' },
    { name: 'Gana', max: 6, score: 6, note: 'Same temperament class' },
    { name: 'Bhakoot', max: 7, score: 7, note: 'Supportive rashi relationship' },
    { name: 'Nadi', max: 8, score: 8, note: 'Different nadi — no dosha' },
  ] as Koota[],
} as const;
