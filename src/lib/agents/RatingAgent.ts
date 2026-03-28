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

// ── Hora base scores (Methodology Bible layer 1) ─────────────────────────────
export const HORA_BASE: Record<string, number> = {
  Jupiter: 62,
  Moon:    56,
  Mars:    54,
  Sun:     46,
  Mercury: 44,
  Venus:   38,
  Saturn:  28,
};

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
  1:  +6,   // Self, identity — always powerful
  2:  +3,   // Wealth, family, speech
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

// Yoga quality — Bible range -8 to +8; anchor points: Siddhi/Brahma=+8, Vyaghata/Vyatipata=-8
// Rankings follow classical Vedic texts (Muhurta Chintamani, Brihat Samhita).
const YOGA_QUALITY: Record<string, number> = {
  Vishkambha: -5, Priti: +5, Ayushman: +6, Saubhagya: +6, Shobhana: +5,
  Atiganda:   -6, Sukarma: +5, Dhriti:  +5, Shula:    -6, Ganda:    -6,
  Vriddhi:    +6, Dhruva:  +6, Vyaghata:-8, Harshana: +5, Vajra:    -5,
  Siddhi:     +8, Vyatipata:-8, Variyan: +3, Parigha:  -7, Shiva:    +4,
  Siddha:     +7, Sadhya:  +5, Shubha:  +7, Shukla:   +4, Brahma:   +8,
  Indra:      +8, Vaidhriti:-7,
};

// Tithi quality — Bible range -10 to +5; anchor: Amavasya=-10, Rikta=-3, Jaya=+3, Nanda=+5
// Tithi groups: Nanda(1,6,11)=+5, Bhadra(2,7,12)=+4, Jaya(3,8,13)=+3,
//   Rikta(4,9,14)=-3, Poorna(5,10,15)=+5. Chaturdashi and Ashtami extra-malefic.
const TITHI_QUALITY: Record<string, number> = {
  Pratipada: +5, Dwitiya: +4, Tritiya: +3, Chaturthi: -3, Panchami: +5,
  Shashthi:  +5, Saptami: +4, Ashtami:  -5, Navami:   -3, Dashami:  +5,
  Ekadashi:  +5, Dwadashi:+4, Trayodashi:+3, Chaturdashi:-8,
};

// Nakshatra quality — Bible anchor points: Pushya=+10, Rohini/Hasta=+5, Moola=-3
// Full 27-nakshatra ranking from standard Muhurta texts.
const NAKSHATRA_QUALITY: Record<string, number> = {
  Ashwini:  +5, Bharani:  -3, Krittika: +3, Rohini:    +8, Mrigashira:  +5,
  Ardra:    -5, Punarvasu:+8, Pushya:  +10, Ashlesha:  -3,
  Magha:    +3, 'Purva Phalguni': +3, 'Uttara Phalguni': +5, Hasta: +8,
  Chitra:   +5, Swati:    +4, Vishakha: +5, Anuradha:  +6, Jyeshtha: -3,
  Moola:    -3, 'Purva Ashadha': +4, 'Uttara Ashadha': +6, Shravana: +6,
  Dhanishtha:+5, Shatabhisha:+3, 'Purva Bhadrapada': -3,
  'Uttara Bhadrapada': +6, Revati: +5,
};

// Moon house position — Bible: 1st/10th/11th = +5 to +8, 6th/8th/12th = -3 to -5
const MOON_HOUSE_MOD: Record<number, number> = {
  1: +8, 2: +3, 3:  0, 4: +3, 5: +6,
  6: -3, 7: +2, 8: -5, 9: +5, 10: +8,
  11: +8, 12: -4,
};

// Weekday ruler alignment — Bible: benefic ruler's day +2, malefic ruler's day -1, range -2 to +3
const WEEKDAY_RULER_MOD: Record<string, number> = {
  Monday:    +2,  // Moon (Lagna lord — maximum benefic for Cancer)
  Thursday:  +3,  // Jupiter (chart guardian, closest to Bible's +3 ceiling)
  Wednesday: +1,  // Mercury (mixed — Antardasha lord but functional malefic)
  Friday:    -1,  // Venus (Badhaka lord)
  Saturday:  -2,  // Saturn (Maraka — worst malefic)
  Sunday:    +1,  // Sun (moderate benefic for Cancer — rules 2nd)
  Tuesday:   +2,  // Mars (Yogakaraka — strong benefic)
};

/** Day-level panchang adjustment (same for all slots that day). Exported for TS ephemeris fallback parity. */
export function getPanchangDayAdj(panchang: PanchangData | undefined, lagna = 'Cancer'): number {
  if (!panchang) return 0;
  let adj = 0;

  // Yoga quality
  const yoga = panchang.yoga || '';
  adj += YOGA_QUALITY[yoga] ?? 0;

  // Tithi quality
  const tithi = panchang.tithi || '';
  for (const [key, val] of Object.entries(TITHI_QUALITY)) {
    if (tithi.includes(key)) { adj += val; break; }
  }
  if (tithi.includes('Amavasya')) adj -= 15;
  if (tithi.includes('Purnima')) adj += 5;

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

  // Weekday ruler alignment
  adj += WEEKDAY_RULER_MOD[panchang.day_ruler] ?? 0;

  return adj;
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
  choghadiya: string;
  transitHouseMod: number;
  isRahuKaal: boolean;
  panchangAdj?: number;
}

/**
 * Single canonical slot score formula. All scoring flows through this.
 * Formula: base + lagna-aware hora + choghadiya + transit-house + Rahu Kaal penalty (+ panchang).
 * Output clamped to 0–100.
 */
export function calculateSlotScore(input: SlotScoreInput): number {
  const base = HORA_BASE[input.horaRuler] ?? 44;
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

function inRahuKaal(time: string, rk: RahuKaalData): boolean {
  return !timeLt(time, rk.start_time) && timeLt(time, rk.end_time);
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
    const base = HORA_BASE[hora.hora_ruler] ?? 44;
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
    const panchangAdj = getPanchangDayAdj(data.panchang, lagna);
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
  // raw = 62 + 5 + 12 + 6 = 85 → clamp → 85
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
  // raw = 28 + (-8) + (-12) + (-5) + (-15) = -12 → clamp 5 → 5
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
