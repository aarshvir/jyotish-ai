/**
 * RatingAgent
 * Deterministic scoring engine matching grandmaster methodology.
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

// ── Hora base scores (validated against grandmaster doc) ─────────────────────
export const HORA_BASE: Record<string, number> = {
  Jupiter: 62,
  Moon:    56,
  Mars:    54,
  Sun:     46,
  Mercury: 44,
  Venus:   38,
  Saturn:  28,
};

// ── Per-lagna hora adjustments ───────────────────────────────────────────────
export const LAGNA_HORA_DELTA: Record<string, Record<string, number>> = {
  Aries:       { Mars: +18, Sun: +12, Jupiter: +10, Mercury: -8,  Venus: -8,  Saturn: -12, Moon: 0   },
  Taurus:      { Venus: +18, Mercury: +12, Saturn: +10, Jupiter: -8, Sun: -8,  Mars: -6,   Moon: 0   },
  Gemini:      { Mercury: +18, Venus: +12, Saturn: +8,  Mars: -10,  Jupiter: -6, Sun: 0,   Moon: 0   },
  Cancer:      { Moon: +20,  Mars: +15,  Jupiter: +10, Sun: +5,   Venus: 0,   Mercury: -10, Saturn: -15 },
  Leo:         { Sun: +20,  Mars: +15,  Jupiter: +10, Moon: +5,  Venus: -8,  Saturn: -10, Mercury: -6  },
  Virgo:       { Mercury: +18, Venus: +12, Saturn: +8,  Mars: -10,  Jupiter: -6, Sun: 0,   Moon: 0   },
  Libra:       { Venus: +18, Saturn: +12, Mercury: +8,  Mars: -12,  Sun: -10,  Jupiter: -5, Moon: 0   },
  Scorpio:     { Mars: +18,  Jupiter: +12, Moon: +8,   Venus: -10, Mercury: -8, Saturn: -5, Sun: 0    },
  Sagittarius: { Jupiter: +18, Sun: +12,  Mars: +10,   Venus: -8,  Mercury: -8, Saturn: -5, Moon: 0   },
  Capricorn:   { Saturn: +18, Venus: +12, Mercury: +8,  Moon: -8,   Sun: -10,  Mars: -5,   Jupiter: 0 },
  Aquarius:    { Saturn: +18, Venus: +10, Mercury: +8,  Moon: -10,  Sun: -12,  Mars: -5,   Jupiter: 0 },
  Pisces:      { Jupiter: +18, Moon: +12, Mars: +10,   Venus: -8,  Mercury: -10, Saturn: -5, Sun: 0   },
};

// ── Choghadiya alias normalization (Chal ≡ Char for scoring) ──────────────────
export function normalizeChoghadiya(name: string): string {
  if (name === 'Char') return 'Chal';
  return name;
}

// ── Choghadiya quality modifiers (Chal and Char equivalent for scoring) ───────
export const CHOGHADIYA_SCORE: Record<string, number> = {
  Amrit:  25,
  Shubh:  18,
  Labh:   18,
  Chal:    5,
  Char:    5,   // Equivalent to Chal per product spec
  Udveg: -10,
  Rog:   -15,
  Kaal:  -15,
};

// ── Transit Lagna House modifiers (from Cancer lagna perspective) ─────────────
// Houses from lagna that are beneficial vs harmful when rising
const TRANSIT_HOUSE_MOD: Record<number, number> = {
  1:  +20,   // Own lagna rising — personal power peak
  2:  +10,   // Wealth, family, speech
  3:   +3,   // Communication, courage
  4:   +8,   // Comfort, home, mother
  5:  +12,   // Creativity, intelligence, children
  6:   -5,   // Competition, service, disease
  7:   +5,   // Partnerships, marriage
  8:  -10,   // Transformation, hidden, obstacles
  9:  +15,   // Fortune, dharma, guru
  10: +18,   // Career zenith — peak professional power
  11: +12,   // Gains, networks, wish fulfillment
  12:  -8,   // Expenses, isolation, foreign
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
const YOGA_QUALITY: Record<string, number> = {
  Vishkambha: -5, Priti: +5, Ayushman: +8, Saubhagya: +10, Shobhana: +5,
  Atiganda: -8, Sukarma: +5, Dhriti: +5, Shula: -8, Ganda: -10,
  Vriddhi: +8, Dhruva: +5, Vyaghata: -8, Harshana: +5, Vajra: -5,
  Siddhi: +10, Vyatipata: -10, Variyan: +3, Parigha: -10, Shiva: +3,
  Siddha: +8, Sadhya: +5, Shubha: +8, Shukla: +5, Brahma: +5,
  Indra: +10, Vaidhriti: -10,
};

const TITHI_QUALITY: Record<string, number> = {
  Pratipada: +3, Dwitiya: +5, Tritiya: +5, Chaturthi: -3, Panchami: +8,
  Shashthi: +3, Saptami: +5, Ashtami: -5, Navami: -3, Dashami: +5,
  Ekadashi: +8, Dwadashi: +3, Trayodashi: +3, Chaturdashi: -8,
};

function getPanchangDayAdj(panchang: PanchangData | undefined): number {
  if (!panchang) return 0;
  let adj = 0;

  const yoga = panchang.yoga || '';
  adj += YOGA_QUALITY[yoga] ?? 0;

  const tithi = panchang.tithi || '';
  for (const [key, val] of Object.entries(TITHI_QUALITY)) {
    if (tithi.includes(key)) { adj += val; break; }
  }

  if (tithi.includes('Amavasya')) adj -= 15;
  if (tithi.includes('Purnima')) adj += 5;

  return adj;
}

// ── Rahu Kaal penalty ────────────────────────────────────────────────────────
const RAHU_KAAL_PENALTY = -50;

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

// ── Score normalisation (0–100) ───────────────────────────────────────────────
const SCORE_MIN = -90;
const SCORE_MAX = 130;

function normalise(rawScore: number): number {
  const clamped = Math.max(SCORE_MIN, Math.min(SCORE_MAX, rawScore));
  return Math.round(((clamped - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * 100);
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
  // Sidereal sun sign (Lahiri, approx 24 days behind tropical)
  const approxSignMap: [number, number, number][] = [
    [0, 14, 9],  // Jan 1-14 → Sagittarius (idx 8... actually Dec/Jan = Sag/Cap)
    [0, 31, 9],  // Jan 15-31 → Capricorn
    [1, 12, 10], // Feb 1-12 → Capricorn
    [1, 28, 10], // Feb 13-28 → Aquarius
    [2, 14, 11], // Mar 1-14 → Aquarius
    [2, 31, 11], // Mar 15-31 → Pisces
  ];
  // Simplified: sun moves ~1° per day, enters new sign every ~30 days
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
    const total = base + lagnaAdj + chogScore + transitHouseMod + panchangAdj + rkPenalty;

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
      total_score: total,
      rating,
      label,
      transit_lagna: transitSign,
      transit_lagna_house: transitHouse,
    };
  }

  rateDay(date: string, data: FullDayData, lagna: string): DayRating {
    const panchangAdj = getPanchangDayAdj(data.panchang);
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

      const transitSign = getApproxTransitLagnaSign(
        hora.start_time,
        sunriseTime,
        sunSignIdx
      );
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
  // 1. Strong slot: Jupiter hora, Cancer lagna, Amrit choghadiya, 10th house, no Rahu Kaal
  const strongScore = calculateSlotScore({
    horaRuler: 'Jupiter',
    lagna: 'Cancer',
    choghadiya: 'Amrit',
    transitHouseMod: 18,
    isRahuKaal: false,
  });
  const strongOk = strongScore >= 85;
  console.log(`[Sanity] Strong slot: ${strongScore} (>= 85?) ${strongOk ? '✓' : '✗'}`);
  if (!strongOk) throw new Error(`Strong slot expected >= 85, got ${strongScore}`);

  // 2. Weak Rahu Kaal: Saturn hora, Kaal choghadiya, 8th house, Rahu Kaal
  const weakScore = calculateSlotScore({
    horaRuler: 'Saturn',
    lagna: 'Cancer',
    choghadiya: 'Kaal',
    transitHouseMod: -10,
    isRahuKaal: true,
  });
  const weakOk = weakScore <= 35;
  console.log(`[Sanity] Weak Rahu Kaal slot: ${weakScore} (<= 35?) ${weakOk ? '✓' : '✗'}`);
  if (!weakOk) throw new Error(`Weak Rahu Kaal slot expected <= 35, got ${weakScore}`);

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
