/**
 * RatingAgent
 * Pure deterministic scoring engine — no API calls, no AI.
 *
 * Scoring layers (additive):
 *   1. Hora base score          (planet-specific, validated against AstroSage)
 *   2. Lagna adjustment         (how the hora lord relates to the native's lagna)
 *   3. Choghadiya score         (quality of the muhurta period)
 *   4. Rahu Kaal penalty        (hard override when active)
 *
 * Final rating is normalised to 1–100 and labelled Excellent/Good/Neutral/Avoid.
 */

import type {
  HoraEntry,
  ChoghadiyaEntry,
  RahuKaalData,
  FullDayData,
  RatedSlot,
  DayRating,
  RatingLabel,
} from './types';

// ── Validated hora base scores ───────────────────────────────────────────────
export const HORA_BASE: Record<string, number> = {
  Jupiter: 62,
  Moon:    56,
  Mars:    54,
  Sun:     46,
  Mercury: 44,
  Venus:   38,
  Saturn:  28,
};

// ── Choghadiya quality scores ────────────────────────────────────────────────
export const CHOGHADIYA_SCORE: Record<string, number> = {
  Amrit:  25,   // Nectar – best
  Shubh:  18,   // Auspicious
  Labh:   18,   // Gain
  Chal:    5,   // Moving – neutral
  Udveg: -10,   // Anxiety
  Rog:   -15,   // Disease
  Kaal:  -15,   // Death
};

// ── Rahu Kaal penalty ────────────────────────────────────────────────────────
const RAHU_KAAL_PENALTY = -50;

/**
 * Per-lagna adjustments to the hora base score.
 * Keys are planet names; values are delta to add.
 * Only common lagnas are listed; unknown lagnas use 0 for all planets.
 */
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

// ── Score normalisation ──────────────────────────────────────────────────────
// Theoretical range after all adjustments: approx -80 to +107
// Map to 1–100 with a linear transform anchored at these extremes.
const SCORE_MIN = -80;
const SCORE_MAX = 107;

function normalise(rawScore: number): number {
  const clamped = Math.max(SCORE_MIN, Math.min(SCORE_MAX, rawScore));
  return Math.round(((clamped - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * 99) + 1;
}

function toLabel(rating: number, isRahuKaal: boolean): RatingLabel {
  if (isRahuKaal) return 'Avoid';
  if (rating >= 72) return 'Excellent';
  if (rating >= 50) return 'Good';
  if (rating >= 32) return 'Neutral';
  return 'Avoid';
}

// ── Time helpers ─────────────────────────────────────────────────────────────

/** Compare two "HH:MM:SS" strings. Returns true if a < b. */
function timeLt(a: string, b: string): boolean {
  return a < b;
}

/** Returns the choghadiya that is active at `time` (falls within its window). */
function findChoghadiya(
  time: string,
  choghadiyas: ChoghadiyaEntry[]
): ChoghadiyaEntry {
  // Normal case: find the slot whose window contains the time
  const found = choghadiyas.find(
    (c) => !timeLt(time, c.start_time) && timeLt(time, c.end_time)
  );
  if (found) return found;

  // Edge case: time equals or exceeds the last end_time (last night slot wraps past midnight)
  // Return the last slot whose start_time <= time, or just the last slot.
  const candidates = choghadiyas.filter((c) => !timeLt(time, c.start_time));
  return candidates[candidates.length - 1] ?? choghadiyas[choghadiyas.length - 1];
}

/** Returns true if `time` falls within the Rahu Kaal window. */
function inRahuKaal(time: string, rk: RahuKaalData): boolean {
  return !timeLt(time, rk.start_time) && timeLt(time, rk.end_time);
}

// ── Public API ───────────────────────────────────────────────────────────────

export class RatingAgent {
  /**
   * Score a single hora slot against the native's lagna.
   * Returns a full RatedSlot with component breakdown.
   */
  rateSlot(
    hora: HoraEntry,
    choghadiya: ChoghadiyaEntry,
    isRahuKaal: boolean,
    lagna: string
  ): RatedSlot {
    const base      = HORA_BASE[hora.hora_ruler] ?? 44;
    const lagnaAdj  = LAGNA_HORA_DELTA[lagna]?.[hora.hora_ruler] ?? 0;
    const chogScore = CHOGHADIYA_SCORE[choghadiya.choghadiya] ?? 0;
    const rkPenalty = isRahuKaal ? RAHU_KAAL_PENALTY : 0;

    const total  = base + lagnaAdj + chogScore + rkPenalty;
    const rating = normalise(total);
    const label  = toLabel(rating, isRahuKaal);

    return {
      start_time:         hora.start_time,
      end_time:           hora.end_time,
      hora_ruler:         hora.hora_ruler,
      choghadiya:         choghadiya.choghadiya,
      choghadiya_quality: choghadiya.quality,
      is_rahu_kaal:       isRahuKaal,
      hora_score:         base + lagnaAdj,
      choghadiya_score:   chogScore,
      rahu_kaal_penalty:  rkPenalty,
      total_score:        total,
      rating,
      label,
    };
  }

  /**
   * Rate every hora slot in a full day and produce aggregate statistics.
   * @param date   "YYYY-MM-DD"
   * @param data   Output from EphemerisAgent.getFullDayData()
   * @param lagna  Native's lagna sign, e.g. "Cancer"
   */
  rateDay(date: string, data: FullDayData, lagna: string): DayRating {
    const slots: RatedSlot[] = data.hora_schedule.map((hora) => {
      const choghadiya = findChoghadiya(hora.start_time, data.choghadiya);
      const isRK       = inRahuKaal(hora.start_time, data.rahu_kaal);
      return this.rateSlot(hora, choghadiya, isRK, lagna);
    });

    const dayScore = Math.round(
      slots.reduce((acc, s) => acc + s.rating, 0) / slots.length
    );

    const sorted       = [...slots].sort((a, b) => b.rating - a.rating);
    const peakWindows  = sorted.slice(0, 3);
    const avoidWindows = sorted.slice(-3).reverse();

    return { date, day_score: dayScore, peak_windows: peakWindows, avoid_windows: avoidWindows, all_slots: slots };
  }

  /** Convenience: score a standalone hora ruler + choghadiya name, no slot context. */
  quickScore(horaRuler: string, choghadiyaName: string, lagna: string, isRahuKaal = false): number {
    const base     = HORA_BASE[horaRuler] ?? 44;
    const lagnaAdj = LAGNA_HORA_DELTA[lagna]?.[horaRuler] ?? 0;
    const chog     = CHOGHADIYA_SCORE[choghadiyaName] ?? 0;
    const rk       = isRahuKaal ? RAHU_KAAL_PENALTY : 0;
    return normalise(base + lagnaAdj + chog + rk);
  }
}
