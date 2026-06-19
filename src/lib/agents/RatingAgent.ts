/**
 * RatingAgent
 * Deterministic scoring engine from the Universal Methodology Bible (published ranges/tables).
 * Do not tune constants to match any proprietary sample forecast — use offline checks for validation only.
 *
 * Scoring layers (additive):
 *   1. Hora base score           (planet-specific)
 *   2. Lagna adjustment          (hora lord's functional role for native's lagna)
 *   3. Choghadiya modifier       (quality of the muhurta period)
 *   4. Transit Lagna House mod   (which house is rising at that hour)
 *   5. Panchang day adjustment   (yoga quality, tithi quality, nakshatra quality)
 *   6. Rahu Kaal penalty         (hard override when active)
 *
 * Final rating normalised to 1–100.
 */

import type {
  HoraEntry,
  ChoghadiyaEntry,
  RahuKaalData,
  FullDayData,
  RatedSlot,
  DayRating,
  RatingLabel,
  PanchangData,
} from './types';
import { computeHoraBaseForLagna, LAGNA_SIGNS_ORDER } from '@/lib/engine/horaBase';
import { getSpecialEventsForDate, specialEventAdj } from './specialEvents';

// ── Per-lagna hora adjustments ────────────────────────────────────────────────
// Zeroed: the grandmaster formula uses the same base scores for all lagnas.
// Functional role is expressed through commentary, not score adjustments,
// to avoid double-counting with the calibrated house modifiers.
export const LAGNA_HORA_DELTA: Record<string, Record<string, number>> = {
  Aries:       {},
  Taurus:      {},
  Gemini:      {},
  Cancer:      {},
  Leo:         {},
  Virgo:       {},
  Libra:       {},
  Scorpio:     {},
  Sagittarius: {},
  Capricorn:   {},
  Aquarius:    {},
  Pisces:      {},
};

// ── Choghadiya alias normalization (Chal ≡ Char for scoring) ──────────────────
export function normalizeChoghadiya(name: string): string {
  if (name === 'Char') return 'Chal';
  return name;
}

// ── Choghadiya quality modifiers (Methodology Bible Step 2) ───────────────────
export const CHOGHADIYA_SCORE: Record<string, number> = {
  Amrit:  12,
  Shubh:   4,
  Labh:    8,
  Chal:    0,
  Char:    0,   // Equivalent to Chal per product spec
  Udveg:  -6,
  Rog:    -8,
  Kaal:  -12,
};

// ── Transit Lagna House modifiers (Methodology Bible Step 3) ─────────────────
export const TRANSIT_HOUSE_MOD: Record<number, number> = {
  1:  +7,   // Self, identity — always powerful (= Python HOUSE_MOD)
  2:  +4,   // Wealth, family, speech (= Python HOUSE_MOD)
  3:   0,   // Communication, neutral
  4:  +1,   // Home, property
  5:  +4,   // Creativity, romance, children (trikona)
  6:  -2,   // Enemies, competition, health
  7:  +1,   // Partnerships
  8:  -5,   // Transformation, danger (dusthana)
  9:  +5,   // Fortune, dharma (best trikona)
  10: +6,   // Career, reputation (best kendra)
  11: +5,   // Gains, wishes, networks
  12: -5,   // Losses, expenses (dusthana)
};

// Map signs to house number from a given lagna
const SIGNS_ORDER = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

function getHouseFromLagna(transitSign: string, lagna: string): number {
  const lagnaIdx = SIGNS_ORDER.indexOf(lagna);
  const transitIdx = SIGNS_ORDER.indexOf(transitSign);
  if (lagnaIdx < 0 || transitIdx < 0) return 0;
  return ((transitIdx - lagnaIdx + 12) % 12) + 1;
}

// ── Panchang quality modifiers (day-level) ──────────────────────────────────
// All values sourced from Bible Step 6 ranges only. No reverse-engineering of
// the grandmaster forecast document. The Bible states: yoga -8 to +8, tithi -10
// to +5, nakshatra -3 to +10, moon house -5 to +8, weekday -2 to +3.

// IMPORTANT: these tables are SYNCED VERBATIM to the Python engine's *_MOD tables
// (ephemeris-service/main.py YOGA_MOD / TITHI_MOD / NAKSHATRA_MOD / MOON_HOUSE_MOD).
// The Python service is the primary scorer; this TS copy runs in the fallback /
// ForecastAgent path. Any drift means the same chart on the same day scores
// differently depending on whether Python was reachable — so panchangParity.test.ts
// asserts these EQUAL the Python values. Update both engines together.
//
// SCOPE: parity holds for these per-modifier TABLE VALUES only. The TS fallback does
// NOT replicate Python's SPECIAL_EVENT_MOD (eclipses/festivals/ekadashi/Pushya-bonus
// + tier stacking), so on special dates the degraded-fallback day score (Python down)
// can still diverge from the primary engine. Accepted fallback limitation, not table drift.

// Yoga quality — = Python YOGA_MOD
const YOGA_QUALITY: Record<string, number> = {
  Vishkambha: -4, Priti: 4, Ayushman: 6, Saubhagya: 10, Shobhana: 5,
  Atiganda:  -18, Sukarma: 3, Dhriti:  5, Shula:    -8, Ganda:   -14,
  Vriddhi:    10, Dhruva:  8, Vyaghata:-16, Harshana: 8, Vajra:    2,
  Siddhi:     10, Vyatipata:-14, Variyan: 2, Parigha:  -8, Shiva:   6,
  Siddha:      8, Sadhya:  4, Shubha:  4, Shukla:    4, Brahma:   12,
  Indra:      12, Vaidhriti:-10,
};

// Tithi quality — = Python TITHI_MOD (30 distinct Shukla/Krishna keys + Purnima/Amavasya).
// Matched via normalizeTithi() against the FULL tithi string (not bare-name substring),
// so Krishna days are no longer scored as their Shukla namesakes.
const TITHI_QUALITY: Record<string, number> = {
  'Shukla Pratipada': 2, 'Shukla Dwitiya': 3, 'Shukla Tritiya': 5, 'Shukla Chaturthi': 1,
  'Shukla Panchami': 3, 'Shukla Shashthi': 2, 'Shukla Saptami': 3, 'Shukla Ashtami': 0,
  'Shukla Navami': 4, 'Shukla Dashami': 3, 'Shukla Ekadashi': 6, 'Shukla Dwadashi': 3,
  'Shukla Trayodashi': 3, 'Shukla Chaturdashi': 2, Purnima: 5,
  'Krishna Pratipada': 0, 'Krishna Dwitiya': 0, 'Krishna Tritiya': 0, 'Krishna Chaturthi': -1,
  'Krishna Panchami': -1, 'Krishna Shashthi': 0, 'Krishna Saptami': -1, 'Krishna Ashtami': -3,
  'Krishna Navami': -3, 'Krishna Dashami': -1, 'Krishna Ekadashi': 5, 'Krishna Dwadashi': 1,
  'Krishna Trayodashi': -2, 'Krishna Chaturdashi': -5, Amavasya: -25,
};

// Mirror of Python normalize_tithi(): map a raw tithi string to a TITHI_QUALITY key.
function normalizeTithi(raw: string): string {
  const t = (raw || '').trim();
  if (!t) return '';
  if (t in TITHI_QUALITY) return t;
  if (t.includes('Amavasya')) return 'Amavasya';
  if (t.includes('/')) {
    const first = normalizeTithi(t.split('/')[0].trim());
    if (first) return first;
  }
  if (t.includes('Purnima')) return 'Purnima';
  const base = t.split('→')[0].trim().replace(/-/g, ' ');
  if (base in TITHI_QUALITY) return base;
  if (!base.includes('Shukla') && !base.includes('Krishna')) {
    if (base.includes('Chaturdashi')) return 'Krishna Chaturdashi';
    if (base.includes('Ekadashi')) return 'Krishna Ekadashi';
  }
  return base;
}

// Nakshatra quality — = Python NAKSHATRA_MOD
const NAKSHATRA_QUALITY: Record<string, number> = {
  Ashwini: 4, Bharani: -4, Krittika: 3, Rohini: 8, Mrigashira: 3,
  Ardra: -8, Punarvasu: 4, Pushya: 15, Ashlesha: -6,
  Magha: 4, 'Purva Phalguni': 4, 'Uttara Phalguni': 3, Hasta: 6,
  Chitra: 3, Swati: 0, Vishakha: 2, Anuradha: 4, Jyeshtha: -2,
  Mula: -6, 'Purva Ashadha': 2, 'Uttara Ashadha': 5, Shravana: 5,
  Dhanishta: 3, Shatabhisha: -2, 'Purva Bhadrapada': -3,
  'Uttara Bhadrapada': 4, Revati: 3,
};

// Moon house position — = Python MOON_HOUSE_MOD
const MOON_HOUSE_MOD: Record<number, number> = {
  1: 6, 2: 3, 3: -2, 4: 3, 5: 5,
  6: -6, 7: 1, 8: -12, 9: 6, 10: 8,
  11: 5, 12: -8,
};

// Weekday ruler alignment, lagna-aware — mirrors the Python compute_weekday_mod.
// `panchang.day_ruler` is the day's ruling PLANET ("Sun".."Saturn"), so we derive
// the modifier from that planet's functional strength (HORA_BASE) for the native's
// actual lagna instead of a fixed Cancer-only table (which, being keyed by weekday
// names, never even matched the planet-named day_ruler — it was silently always 0).
function weekdayModForLagna(dayRulerPlanet: string, lagnaIdx: number): number {
  if (!dayRulerPlanet) return 0;
  const base = computeHoraBaseForLagna(lagnaIdx)[dayRulerPlanet] ?? 44;
  if (base >= 60) return 6;
  if (base >= 54) return 4;
  if (base >= 48) return 2;
  if (base >= 44) return 0;
  if (base >= 38) return -2;
  if (base >= 32) return -4;
  return -5;
}

/** Day-level panchang adjustment (same for all slots that day). Exported for TS ephemeris fallback parity. */
export function getPanchangDayAdj(
  panchang: PanchangData | undefined,
  lagna = 'Cancer',
  dateStr?: string,
): number {
  if (!panchang) return 0;
  let adj = 0;

  // Yoga quality
  const yoga = panchang.yoga || '';
  const yogaVal = YOGA_QUALITY[yoga] ?? 0;
  adj += yogaVal;

  // Tithi quality — exact lookup on the normalized full tithi string (paksha-aware)
  const normTithi = normalizeTithi(panchang.tithi || '');
  const tithiVal = TITHI_QUALITY[normTithi] ?? 0;
  adj += tithiVal;

  // Nakshatra quality
  const nakshatra = panchang.nakshatra || '';
  for (const [name, val] of Object.entries(NAKSHATRA_QUALITY)) {
    if (nakshatra.includes(name)) { adj += val; break; }
  }

  // Moon house position
  const moonSign = panchang.moon_sign || '';
  if (moonSign) {
    const moonHouse = getHouseFromLagna(moonSign.split(' ')[0] ?? moonSign, lagna);
    if (moonHouse > 0) adj += MOON_HOUSE_MOD[moonHouse] ?? 0;
  }

  // Weekday ruler alignment (lagna-aware; day_ruler is a planet name)
  const lagnaIdx = LAGNA_SIGNS_ORDER.indexOf(lagna as (typeof LAGNA_SIGNS_ORDER)[number]);
  adj += weekdayModForLagna(panchang.day_ruler, lagnaIdx >= 0 ? lagnaIdx : 3);

  // Special events (eclipses / festivals / ekadashi / Pushya + tier stacking) — only
  // when a date is supplied. Mirrors Python compute_dq + generate_daily_grid: the
  // calendar events PLUS the tithi/nakshatra-derived ekadashi/purnima/pushya flags.
  if (dateStr) {
    const events = getSpecialEventsForDate(dateStr);
    if (normTithi.includes('Ekadashi') && !events.includes('ekadashi')) events.push('ekadashi');
    if (normTithi === 'Purnima' && !events.includes('purnima')) events.push('purnima');
    if (nakshatra === 'Pushya' && normTithi.startsWith('Shukla') && !events.includes('pushya_shukla_bonus')) {
      events.push('pushya_shukla_bonus');
    }
    adj += specialEventAdj(events, yogaVal, tithiVal, nakshatra);
  }

  // Clamp the day-level adjustment to match Python compute_dq's max(-40, min(45, dq)).
  return Math.max(-40, Math.min(45, adj));
}

// ── Rahu Kaal penalty (Methodology Bible Step 5) ─────────────────────────────
const RAHU_KAAL_PENALTY = -15;

// ── Transit lagna calculation (approximate by hora slot position) ─────────────
// Each hora is ~1 hour. Lagna moves ~1 sign per 2 hours.
// At sunrise, the transit lagna ≈ the sign the Sun is in (roughly).
// We'll approximate: transit_lagna_sign_index = (sunrise_sign + floor(hours_since_sunrise / 2)) % 12
function getApproxTransitLagnaSign(
  slotStartTime: string,
  sunriseTime: string,
  sunSignIndex: number
): string {
  const toMin = (t: string) => {
    const parts = t.split(':').map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  };

  let minutesSinceSunrise = toMin(slotStartTime) - toMin(sunriseTime);
  if (minutesSinceSunrise < 0) minutesSinceSunrise += 24 * 60;

  const signsAdvanced = Math.floor(minutesSinceSunrise / 120);
  const transitIdx = (sunSignIndex + signsAdvanced) % 12;
  return SIGNS_ORDER[transitIdx];
}

// ── Score normalisation — clamp to 5–98 (Methodology Bible Step 5) ───────────
function normalise(rawScore: number): number {
  return Math.max(5, Math.min(98, Math.round(rawScore)));
}

// ── Canonical scoring engine (single source of truth) ─────────────────────────

export interface SlotScoreInput {
  horaRuler: string;
  lagna: string;
  /** When set, overrides `lagna` string resolution for HORA_BASE (0–11). */
  lagnaSignIndex?: number;
  choghadiya: string;
  transitHouseMod: number;
  isRahuKaal: boolean;
  panchangAdj?: number;
}

function resolveLagnaSignIndex(input: SlotScoreInput): number {
  if (
    typeof input.lagnaSignIndex === 'number' &&
    Number.isFinite(input.lagnaSignIndex) &&
    input.lagnaSignIndex >= 0 &&
    input.lagnaSignIndex <= 11
  ) {
    return input.lagnaSignIndex;
  }
  const ix = LAGNA_SIGNS_ORDER.indexOf(input.lagna as (typeof LAGNA_SIGNS_ORDER)[number]);
  if (ix >= 0) return ix;
  console.warn('[RatingAgent] Unknown lagna for HORA_BASE; defaulting to Cancer (3).');
  return 3;
}

/**
 * Single canonical slot score formula. All scoring flows through this.
 * Formula: base + lagna-aware hora + choghadiya + transit-house + Rahu Kaal penalty (+ panchang).
 * Output clamped to 0–100.
 */
export function calculateSlotScore(input: SlotScoreInput): number {
  const lagnaIdx = resolveLagnaSignIndex(input);
  const horaTable = computeHoraBaseForLagna(lagnaIdx);
  const base = horaTable[input.horaRuler] ?? 44;
  const lagnaMod = LAGNA_HORA_DELTA[input.lagna]?.[input.horaRuler] ?? 0;
  const chogMod = CHOGHADIYA_SCORE[normalizeChoghadiya(input.choghadiya)] ?? 0;
  const transitMod = input.transitHouseMod;
  const rkPenalty = input.isRahuKaal ? RAHU_KAAL_PENALTY : 0;
  const panchangMod = input.panchangAdj ?? 0;

  const raw = base + lagnaMod + chogMod + transitMod + rkPenalty + panchangMod;
  return normalise(raw);
}

/**
 * Day score = mean of exactly 18 slot scores. Throws if slots.length !== 18.
 */
export function calculateDayScore(
  slots: Array<{ score: number } | { rating: number }>
): number {
  if (slots.length !== 18) {
    throw new Error(
      `calculateDayScore requires exactly 18 slots, got ${slots.length}`
    );
  }
  const sum = slots.reduce(
    (acc, s) => acc + ('score' in s ? s.score : s.rating),
    0
  );
  return Math.round(sum / 18);
}

/**
 * 7-tier label from score. Rahu Kaal overrides to Avoid.
 * Thresholds: 85 Peak, 75 Excellent, 65 Good, 50 Neutral, 45 Caution, 40 Difficult, else Avoid.
 * (52 → Neutral, 34 → Avoid)
 */
export function getScoreLabel(
  score: number,
  isRahuKaal?: boolean
): RatingLabel {
  if (isRahuKaal) return 'Avoid';
  if (score >= 85) return 'Peak';
  if (score >= 75) return 'Excellent';
  if (score >= 65) return 'Good';
  if (score >= 50) return 'Neutral';
  if (score >= 45) return 'Caution';
  if (score >= 35) return 'Difficult';
  return 'Avoid';
}

function toLabel(rating: number, isRahuKaal: boolean): RatingLabel {
  return getScoreLabel(rating, isRahuKaal);
}

// ── Gold-anchor drift checker ─────────────────────────────────────────────────
const GOLD_ANCHOR_DATES = ['2026-02-17', '2026-02-24', '2026-03-10'];

export function checkScoreDrift(
  date: string,
  dayScore: number,
  slotScores: number[]
): { ok: boolean; message?: string } {
  if (!GOLD_ANCHOR_DATES.includes(date)) return { ok: true };
  if (slotScores.length !== 18) {
    return { ok: false, message: `Gold-anchor ${date}: expected 18 slots, got ${slotScores.length}` };
  }
  const mean = slotScores.reduce((a, b) => a + b, 0) / 18;
  const rounded = Math.round(mean);
  if (Math.abs(dayScore - rounded) > 2) {
    return {
      ok: false,
      message: `Gold-anchor ${date}: day_score ${dayScore} drifts from slot mean ${rounded}`,
    };
  }
  return { ok: true };
}

// ── Time helpers ─────────────────────────────────────────────────────────────
function timeLt(a: string, b: string): boolean { return a < b; }

function findChoghadiya(time: string, choghadiyas: ChoghadiyaEntry[]): ChoghadiyaEntry {
  const found = choghadiyas.find(
    (c) => !timeLt(time, c.start_time) && timeLt(time, c.end_time)
  );
  if (found) return found;
  const candidates = choghadiyas.filter((c) => !timeLt(time, c.start_time));
  return candidates[candidates.length - 1] ?? choghadiyas[choghadiyas.length - 1];
}

function addMinutesToTime(time: string, minutes: number): string {
  const parts = time.split(':').map(Number);
  const totalMins = (parts[0] || 0) * 60 + (parts[1] || 0) + minutes;
  const h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${parts[2] !== undefined ? String(parts[2]).padStart(2, '0') : '00'}`;
}

function inRahuKaal(slotStartTime: string, rk: RahuKaalData): boolean {
  const midpoint = addMinutesToTime(slotStartTime, 30);
  return !timeLt(midpoint, rk.start_time) && timeLt(midpoint, rk.end_time);
}

// Guess sun's sidereal sign index from the date (approximate)
function getSunSignIndex(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00Z');
  const month = d.getUTCMonth(); // 0-11
  const day = d.getUTCDate();
  // Simplified sidereal sun sign (Lahiri, approx): sun moves ~1°/day, ~30 days/sign.
  // For Feb 2026: Sun is in Aquarius (sidereal, Lahiri)
  // Jan 14 - Feb 12: Capricorn (9), Feb 13 - Mar 14: Aquarius (10), Mar 15 - Apr 13: Pisces (11)
  if (month === 0 && day < 14) return 8;  // Sagittarius
  if (month === 0) return 9;               // Capricorn
  if (month === 1 && day <= 12) return 9;  // Capricorn
  if (month === 1) return 10;              // Aquarius
  if (month === 2 && day <= 14) return 10; // Aquarius
  if (month === 2) return 11;              // Pisces
  if (month === 3 && day <= 13) return 0;  // Aries
  if (month === 3) return 1;               // Taurus
  if (month === 4 && day <= 14) return 1;  // Taurus
  if (month === 4) return 2;               // Gemini
  if (month === 5 && day <= 14) return 2;  // Gemini
  if (month === 5) return 3;               // Cancer
  if (month === 6 && day <= 16) return 3;  // Cancer
  if (month === 6) return 4;               // Leo
  if (month === 7 && day <= 16) return 4;  // Leo
  if (month === 7) return 5;               // Virgo
  if (month === 8 && day <= 16) return 5;  // Virgo
  if (month === 8) return 6;               // Libra
  if (month === 9 && day <= 16) return 6;  // Libra
  if (month === 9) return 7;               // Scorpio
  if (month === 10 && day <= 15) return 7; // Scorpio
  if (month === 10) return 8;              // Sagittarius
  if (month === 11 && day <= 14) return 8; // Sagittarius
  return 9;                                 // Capricorn
}

// ── Public API ───────────────────────────────────────────────────────────────

export class RatingAgent {
  rateSlot(
    hora: HoraEntry,
    choghadiya: ChoghadiyaEntry,
    isRahuKaal: boolean,
    lagna: string,
    transitHouseMod: number = 0,
    panchangAdj: number = 0,
    transitSign?: string,
    transitHouse?: number,
  ): RatedSlot {
    const lagnaIdx = resolveLagnaSignIndex({ horaRuler: hora.hora_ruler, lagna, choghadiya: choghadiya.choghadiya, transitHouseMod, isRahuKaal, panchangAdj });
    const hb = computeHoraBaseForLagna(lagnaIdx);
    const base = hb[hora.hora_ruler] ?? 44;
    const lagnaAdj = LAGNA_HORA_DELTA[lagna]?.[hora.hora_ruler] ?? 0;
    const chogScore = CHOGHADIYA_SCORE[normalizeChoghadiya(choghadiya.choghadiya)] ?? 0;
    const rkPenalty = isRahuKaal ? RAHU_KAAL_PENALTY : 0;

    const rating = calculateSlotScore({
      horaRuler: hora.hora_ruler,
      lagna,
      choghadiya: choghadiya.choghadiya,
      transitHouseMod,
      isRahuKaal,
      panchangAdj,
    });
    const label = toLabel(rating, isRahuKaal);

    return {
      start_time: hora.start_time,
      end_time: hora.end_time,
      hora_ruler: hora.hora_ruler,
      choghadiya: choghadiya.choghadiya,
      choghadiya_quality: choghadiya.quality,
      is_rahu_kaal: isRahuKaal,
      hora_score: base + lagnaAdj,
      choghadiya_score: chogScore,
      rahu_kaal_penalty: rkPenalty,
      total_score: rating,   // same clamped 5-98 value; raw sum was misleading
      rating,
      label,
      transit_lagna: transitSign,
      transit_lagna_house: transitHouse,
    };
  }

  rateDay(date: string, data: FullDayData, lagna: string): DayRating {
    const panchangAdj = getPanchangDayAdj(data.panchang, lagna, date);
    const sunSignIdx = getSunSignIndex(date);
    const sunriseTime = data.panchang?.sunrise || '06:00:00';

    // Take exactly 18 slots for 06:00–24:00 (canonical day buckets)
    const relevantHoras = data.hora_schedule.filter((h) => {
      const hour = parseInt(h.start_time.split(':')[0] ?? '0', 10);
      return hour >= 6 && hour < 24;
    });
    const horas18 =
      relevantHoras.length >= 18
        ? relevantHoras.slice(0, 18)
        : data.hora_schedule.slice(0, 18);

    if (horas18.length !== 18) {
      throw new Error(
        `rateDay requires exactly 18 hora slots (06:00–24:00), got ${horas18.length}`
      );
    }

    const slots: RatedSlot[] = horas18.map((hora) => {
      const choghadiya = findChoghadiya(hora.start_time, data.choghadiya);
      const isRK = inRahuKaal(hora.start_time, data.rahu_kaal);

      // Prefer actual transit_lagna from ephemeris data if the hora entry carries it;
      // fall back to the calendar approximation only when absent.
      const ephTransitSign = (hora as HoraEntry & { transit_lagna?: string }).transit_lagna;
      const transitSign = (ephTransitSign && SIGNS_ORDER.includes(ephTransitSign))
        ? ephTransitSign
        : getApproxTransitLagnaSign(hora.start_time, sunriseTime, sunSignIdx);

      const transitHouse = getHouseFromLagna(transitSign, lagna);
      const transitMod = TRANSIT_HOUSE_MOD[transitHouse] ?? 0;

      return this.rateSlot(
        hora,
        choghadiya,
        isRK,
        lagna,
        transitMod,
        panchangAdj,
        transitSign,
        transitHouse
      );
    });

    const dayScore = calculateDayScore(slots);

    const drift = checkScoreDrift(date, dayScore, slots.map((s) => s.rating));
    if (!drift.ok && process.env.NODE_ENV === 'development') {
      console.warn('[RatingAgent] Score drift:', drift.message);
    }

    const sorted = [...slots].sort((a, b) => b.rating - a.rating);
    const peakWindows = sorted.slice(0, 3);
    const avoidWindows = sorted.slice(-3).reverse();

    return {
      date,
      day_score: dayScore,
      peak_windows: peakWindows,
      avoid_windows: avoidWindows,
      all_slots: slots,
    };
  }

  quickScore(horaRuler: string, choghadiyaName: string, lagna: string, isRahuKaal = false): number {
    return calculateSlotScore({
      horaRuler,
      lagna,
      choghadiya: normalizeChoghadiya(choghadiyaName),
      transitHouseMod: 0,
      isRahuKaal,
    });
  }
}

// ── Sanity checks ─────────────────────────────────────────────────────────────

export function runSanityChecks(): void {
  // 1. Strong slot: Jupiter hora, Cancer lagna, Amrit choghadiya, H1 (+6), no Rahu Kaal
  // raw ≈ 62 + 0 (lagna delta) + 12 + 6 = 80 → clamp → 80
  const strongScore = calculateSlotScore({
    horaRuler: 'Jupiter',
    lagna: 'Cancer',
    choghadiya: 'Amrit',
    transitHouseMod: 6,
    isRahuKaal: false,
  });
  const strongOk = strongScore >= 75;
  console.log(`[Sanity] Strong slot: ${strongScore} (>= 75?) ${strongOk ? '✓' : '✗'}`);
  if (!strongOk) throw new Error(`Strong slot expected >= 75, got ${strongScore}`);

  // 2. Weak Rahu Kaal: Saturn hora, Kaal choghadiya, 8th house (-5), Rahu Kaal (-15)
  // raw = 28 + 0 + (-12) + (-5) + (-15) = -4 → clamp 5 → 5
  const weakScore = calculateSlotScore({
    horaRuler: 'Saturn',
    lagna: 'Cancer',
    choghadiya: 'Kaal',
    transitHouseMod: -5,
    isRahuKaal: true,
  });
  const weakOk = weakScore <= 20;
  console.log(`[Sanity] Weak Rahu Kaal slot: ${weakScore} (<= 20?) ${weakOk ? '✓' : '✗'}`);
  if (!weakOk) throw new Error(`Weak Rahu Kaal slot expected <= 20, got ${weakScore}`);

  // 3. Chal/Char equivalence
  const chalScore = calculateSlotScore({
    horaRuler: 'Moon',
    lagna: 'Cancer',
    choghadiya: 'Chal',
    transitHouseMod: 0,
    isRahuKaal: false,
  });
  const charScore = calculateSlotScore({
    horaRuler: 'Moon',
    lagna: 'Cancer',
    choghadiya: 'Char',
    transitHouseMod: 0,
    isRahuKaal: false,
  });
  const chalCharOk = chalScore === charScore;
  console.log(`[Sanity] Chal/Char equivalence: Chal=${chalScore}, Char=${charScore} ${chalCharOk ? '✓' : '✗'}`);
  if (!chalCharOk) throw new Error(`Chal and Char must yield same score, got ${chalScore} vs ${charScore}`);

  // 4. calculateDayScore throws on wrong count
  try {
    calculateDayScore([{ rating: 50 }, { rating: 60 }]);
    throw new Error('calculateDayScore should throw for non-18 slots');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const ok = msg.includes('exactly 18');
    console.log(`[Sanity] calculateDayScore throws on wrong count: ${ok ? '✓' : '✗'}`);
    if (!ok) throw e;
  }

  console.log('[Sanity] All checks passed.');
}
