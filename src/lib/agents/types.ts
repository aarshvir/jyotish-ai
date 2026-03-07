// =============================================================================
// SECTION 1 — Ephemeris service I/O types
// =============================================================================

export interface NatalChartInput {
  birth_date: string;  // "YYYY-MM-DD"
  birth_time: string;  // "HH:MM:SS"  local time; service converts to UTC
  birth_city: string;
  birth_lat: number;
  birth_lng: number;
}

export interface PlanetData {
  sign: string;
  degree: number;
  nakshatra: string;
  nakshatra_pada: number;
  is_retrograde: boolean;
  house: number;
}

export interface AntardashaEntry {
  planet: string;
  start_date: string;
  end_date: string;
}

export interface DashaEntry {
  planet: string;
  start_date: string;
  end_date: string;
  antardasha: AntardashaEntry[];
}

export interface CurrentDasha {
  mahadasha: string;
  antardasha: string;
  start_date: string;
  end_date: string;
}

export interface NatalChartData {
  lagna: string;
  lagna_degree: number;
  planets: Record<string, PlanetData>;
  moon_nakshatra: string;
  dasha_sequence: DashaEntry[];
  current_dasha: CurrentDasha;
}

export interface PanchangData {
  tithi: string;
  nakshatra: string;
  yoga: string;
  karana: string;
  sunrise: string;
  sunset: string;
  moon_sign: string;
  day_ruler: string;
}

export interface HoraEntry {
  start_time: string;
  end_time: string;
  hora_ruler: string;
  hora_number: number;
}

export interface ChoghadiyaEntry {
  start_time: string;
  end_time: string;
  choghadiya: string;
  quality: string;
}

export interface RahuKaalData {
  start_time: string;
  end_time: string;
}

export interface FullDayData {
  panchang: PanchangData;
  hora_schedule: HoraEntry[];
  choghadiya: ChoghadiyaEntry[];
  rahu_kaal: RahuKaalData;
}

// =============================================================================
// SECTION 2 — NativityAgent types
// =============================================================================

export interface Yoga {
  name: string;
  description: string;
  strength: 'strong' | 'moderate' | 'weak';
}

export interface PlanetaryPosition {
  planet: string;
  sign: string;
  house: number;
  nakshatra: string;
  dignity?: string;
  significance?: string;
}

export interface NativityProfile {
  lagna_sign: string;
  lagna_analysis: string;
  yogas: Yoga[];
  functional_benefics: string[];
  functional_malefics: string[];
  yogakarakas: string[];
  strengths: string[];
  challenges: string[];
  current_dasha_interpretation: string;
  summary: string;
  planetary_positions?: PlanetaryPosition[];
  life_themes?: string[];
  current_year_theme?: string;
}

// =============================================================================
// SECTION 3 — RatingAgent types
// =============================================================================

export type RatingLabel = 'Peak' | 'Excellent' | 'Good' | 'Neutral' | 'Caution' | 'Difficult' | 'Avoid';

export interface RatedSlot {
  start_time: string;
  end_time: string;
  hora_ruler: string;
  choghadiya: string;
  choghadiya_quality: string;
  is_rahu_kaal: boolean;
  hora_score: number;        // base + lagna adjustment
  choghadiya_score: number;
  rahu_kaal_penalty: number;
  total_score: number;
  rating: number;            // 1–100
  label: RatingLabel;
  transit_lagna?: string;
  transit_lagna_house?: number;
}

export interface DayRating {
  date: string;
  day_score: number;         // mean rating across all slots
  peak_windows: RatedSlot[];    // top 3
  avoid_windows: RatedSlot[];   // bottom 3
  all_slots: RatedSlot[];
}

// =============================================================================
// SECTION 4 — ForecastAgent types
// =============================================================================

export interface ForecastInput {
  natalChart: NatalChartData;
  birthLat: number;
  birthLng: number;
  currentLat: number;
  currentLng: number;
  timezoneOffset: number;    // offset in MINUTES east of UTC (e.g. IST = 330, GST = 240)
  dateFrom: string;          // "YYYY-MM-DD"
  dateTo: string;            // "YYYY-MM-DD"
}

export interface DayNarrative {
  date: string;
  narrative: string;
  best_times: string[];
  avoid_times: string[];
}

/** Agent-internal day shape produced by ForecastAgent. See canonical DayForecast in Section 5. */
export interface AgentDayForecast {
  date: string;
  panchang: PanchangData;
  rating: DayRating;
  narrative: string;
  best_times: string[];
  avoid_times: string[];
  rahu_kaal?: { start_time: string; end_time: string };
}

export interface ForecastOutput {
  period: { from: string; to: string };
  lagna: string;
  current_dasha: CurrentDasha;
  days: AgentDayForecast[];
  weekly_summary: string;
}

// =============================================================================
// SECTION 5 — Canonical report-contract types
//
// INVARIANTS (enforced by comments; runtime-checked by validateReportData):
//   • Every DayReport must contain exactly 18 HoraSlots
//   • HoraSlot.display_label is always a top-of-hour range e.g. "06:00–07:00"
//   • HoraSlot.start_iso < HoraSlot.end_iso (validated via Date parse)
//   • HoraSlot.midpoint_iso is between start_iso and end_iso
//   • HoraSlot.commentary and HoraSlot.commentary_short are NEVER empty in the
//     final rendered report — a deterministic fallback must be injected upstream
//   • ReportData.months.length === 12
//   • ReportData.weeks.length === 6
//   • DayForecast.day_score === mean of exactly 18 slot scores (no other inputs)
// =============================================================================

/** Per-domain numeric scores (0–100). Used on MonthSummary and PeriodSynthesis. */
export interface DomainScores {
  career: number;
  money: number;
  health: number;
  relationships: number;
}

/**
 * One fixed hourly bucket in the current-city local timezone.
 *
 * INVARIANT: display_label is always a top-of-hour range, e.g. "06:00–07:00".
 * Raw astro transition timestamps must NOT appear here.
 * commentary and commentary_short must NEVER be empty strings in the
 * final rendered report — inject a deterministic fallback if the AI call fails.
 */
export interface HoraSlot {
  /** 0-indexed position within the 18-slot day (0 = 06:00, 17 = 23:00). */
  slot_index: number;

  /** Always a top-of-hour range in current-city local time, e.g. "06:00–07:00". */
  display_label: string;

  /**
   * ISO 8601 timestamp for the start of the slot bucket (current-city local, with offset).
   * e.g. "2026-02-24T06:00:00+04:00"
   * INVARIANT: start_iso < end_iso (validated at runtime).
   */
  start_iso: string;

  /**
   * ISO 8601 timestamp for the end of the slot bucket.
   * e.g. "2026-02-24T07:00:00+04:00"
   * INVARIANT: end_iso > start_iso.
   */
  end_iso: string;

  /**
   * ISO 8601 timestamp for the midpoint of the slot (used for transit lagna calculation).
   * INVARIANT: start_iso < midpoint_iso < end_iso.
   */
  midpoint_iso: string;

  /** Hora planet name, e.g. "Mars", "Moon". */
  hora_planet: string;

  /** Unicode symbol for the hora planet, e.g. "♂". */
  hora_planet_symbol: string;

  /** Choghadiya name for this slot, e.g. "Amrit", "Kaal". */
  choghadiya: string;

  /** Human-readable quality of choghadiya, e.g. "Excellent", "Inauspicious". */
  choghadiya_quality: string;

  /** Whether this slot falls inside Rahu Kaal. */
  is_rahu_kaal: boolean;

  /** Rising sign at the midpoint of the slot, e.g. "Capricorn". */
  transit_lagna: string;

  /** House number of transit_lagna relative to natal lagna (1–12). */
  transit_lagna_house: number;

  /** Composite score 1–100 for this slot. */
  score: number;

  /** 7-tier label derived from score. */
  label: RatingLabel;

  /**
   * Full grandmaster-quality commentary (100–150 words, 3 paragraphs).
   * MUST NOT be empty in the final render — inject fallback upstream.
   */
  commentary: string;

  /**
   * Short teaser shown before expansion (~120 chars).
   * MUST NOT be empty — derive from commentary if AI omits it.
   */
  commentary_short: string;
}

/**
 * One calendar day in the report.
 *
 * INVARIANT: slots.length === 18 (06:00–23:00, top-of-hour buckets).
 * INVARIANT: day_score === Math.round(mean of slots[*].score).
 */
export interface DayForecast {
  /** "YYYY-MM-DD" */
  date: string;

  /** Weekday + date label shown in UI, e.g. "Mon · Feb 24". */
  day_label: string;

  /**
   * Composite day score 1–100.
   * MUST equal Math.round(average of exactly 18 slot scores).
   */
  day_score: number;

  /** 7-tier label for the day. */
  day_label_tier: RatingLabel;

  /** One-line italic theme for the day, e.g. "Yogakaraka surges — act boldly". */
  day_theme: string;

  /**
   * 200–250 word daily overview covering 7 required elements.
   * MUST NOT be empty.
   */
  overview: string;

  /** Panchang data for the day. */
  panchang: PanchangData;

  /** Rahu Kaal window in local time. */
  rahu_kaal: { start: string; end: string } | null;

  /**
   * Exactly 18 hourly slots covering 06:00–24:00 in the current city.
   * INVARIANT: length === 18 always.
   */
  slots: HoraSlot[];

  /** Count of slots with score >= 75 (non-Rahu Kaal). */
  peak_count: number;

  /** Count of slots with score < 45 OR is_rahu_kaal. */
  caution_count: number;
}

/** One week summary entry. */
export interface WeekSummary {
  /** Human-readable label, e.g. "Week 1 of 6 · Feb 24–Mar 2". */
  week_label: string;

  /** ISO date of Monday for this week, "YYYY-MM-DD". */
  week_start: string;

  /** Composite week score 1–100. */
  score: number;

  /** One-line italic theme. */
  theme: string;

  /**
   * 220-word weekly commentary covering energy arc, standout days, and domain guidance.
   * MUST NOT be empty.
   */
  commentary: string;

  /** Per-day scores for sparkline (length 7). */
  daily_scores: number[];

  /** Moon sign per day for moon journey pills (length 7, e.g. ["Cancer","Cancer","Leo",…]). */
  moon_journey: string[];

  /** Count of days with score >= 75. */
  peak_days_count: number;

  /** Count of days with score < 50. */
  caution_days_count: number;
}

/**
 * One calendar month summary.
 * INVARIANT: ReportData.months.length === 12 always.
 */
export interface MonthSummary {
  /** Human-readable label, e.g. "February 2026". */
  month: string;

  /** Composite month score 1–100. */
  score: number;

  /** Alias for score (used by some components). */
  overall_score: number;

  domain_scores: DomainScores;

  /** One-line italic theme. */
  theme: string;

  /**
   * 350-word monthly commentary.
   * MUST NOT be empty.
   */
  commentary: string;

  /** Key transits relevant to the native's lagna. */
  key_transits: string[];

  /** Per-week scores within the month (length 4–5). */
  weekly_scores: number[];
}

/** Strategic or caution date window used in PeriodSynthesis. */
export interface SynthesisDateEntry {
  /** "YYYY-MM-DD" */
  date: string;
  nakshatra: string;
  score: number;
  /** Specific astrological reason. MUST NOT be empty. */
  reason: string;
}

/**
 * Period synthesis — full-period overview present in every report.
 * INVARIANT: opening_paragraph must be non-empty.
 */
export interface PeriodSynthesis {
  /**
   * 200-word overview of dominant patterns for the full forecast period.
   * MUST NOT be empty.
   */
  opening_paragraph: string;

  /** Top positive date windows (>= 1 entry expected). */
  strategic_windows: SynthesisDateEntry[];

  /** Top caution date windows (>= 1 entry expected). */
  caution_dates: SynthesisDateEntry[];

  /** 50-word per-domain guidance strings. MUST NOT be empty. */
  domain_priorities: {
    career: string;
    money: string;
    health: string;
    relationships: string;
  };

  /**
   * 100-word spiritual/philosophical closing.
   * MUST NOT be empty.
   */
  closing_paragraph: string;
}

/**
 * Nativity (birth chart) data used in the Nativity section of the report.
 * INVARIANT: lagna_analysis must be non-empty.
 */
export interface NativityData {
  /** Natal chart from the ephemeris service. */
  natal_chart: NatalChartData;

  /**
   * 200-word lagna analysis.
   * MUST NOT be empty.
   */
  lagna_analysis: string;

  /** Identified yogas, key_yogas strings, or structured Yoga entries. */
  key_yogas: string[] | Yoga[];

  /** Functional benefic planets for the lagna, e.g. ["Moon", "Mars", "Jupiter"]. */
  functional_benefics: string[];

  /** Functional malefic planets for the lagna, e.g. ["Saturn", "Mercury"]. */
  functional_malefics: string[];

  /**
   * 150-word current dasha interpretation.
   * MUST NOT be empty.
   */
  current_dasha_interpretation: string;

  /** Optional NativityProfile from the NativityAgent (may be absent in free reports). */
  profile?: NativityProfile;
}

/**
 * Top-level canonical report shape returned by the full report pipeline.
 *
 * INVARIANTS:
 *   • months.length === 12
 *   • weeks.length === 6
 *   • days.length === 3 | 7 | 30 depending on plan (never 0)
   *   • Every DayForecast in days has slots.length === 18
 *   • synthesis.opening_paragraph is non-empty
 *   • nativity.lagna_analysis is non-empty
 */
export interface ReportData {
  /** Unique report identifier. */
  report_id: string;

  /** "7day" | "monthly" | "free" */
  report_type: string;

  /** ISO date when the report was generated, "YYYY-MM-DD". */
  generated_at: string;

  nativity: NativityData;

  /**
   * Always 12 entries — one per calendar month starting from the current month.
   * INVARIANT: length === 12.
   */
  months: MonthSummary[];

  /**
   * Always 6 entries — one per week starting from the current week.
   * INVARIANT: length === 6.
   */
  weeks: WeekSummary[];

  /**
   * 3 days (free), 7 days (7day plan), or 30 days (monthly plan).
   * Every entry has slots.length === 18.
   */
  days: DayForecast[];

  synthesis: PeriodSynthesis;
}
