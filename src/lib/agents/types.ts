// ── Ephemeris service I/O types ──────────────────────────────────────────────

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

// ── NativityAgent types ──────────────────────────────────────────────────────

export interface Yoga {
  name: string;
  description: string;
  strength: 'strong' | 'moderate' | 'weak';
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
}

// ── RatingAgent types ────────────────────────────────────────────────────────

export type RatingLabel = 'Excellent' | 'Good' | 'Neutral' | 'Avoid';

export interface RatedSlot {
  start_time: string;
  end_time: string;
  hora_ruler: string;
  choghadiya: string;
  choghadiya_quality: string;
  is_rahu_kaal: boolean;
  hora_score: number;       // base + lagna adjustment
  choghadiya_score: number;
  rahu_kaal_penalty: number;
  total_score: number;
  rating: number;           // 1–100
  label: RatingLabel;
}

export interface DayRating {
  date: string;
  day_score: number;        // mean rating across all slots
  peak_windows: RatedSlot[];   // top 3
  avoid_windows: RatedSlot[];  // bottom 3
  all_slots: RatedSlot[];
}

// ── ForecastAgent types ──────────────────────────────────────────────────────

export interface ForecastInput {
  natalChart: NatalChartData;
  birthLat: number;
  birthLng: number;
  currentLat: number;
  currentLng: number;
  timezoneOffset: number;   // hours from UTC, e.g. 5.5 for IST
  dateFrom: string;         // "YYYY-MM-DD"
  dateTo: string;           // "YYYY-MM-DD"
}

export interface DayNarrative {
  date: string;
  narrative: string;
  best_times: string[];
  avoid_times: string[];
}

export interface DayForecast {
  date: string;
  panchang: PanchangData;
  rating: DayRating;
  narrative: string;
  best_times: string[];
  avoid_times: string[];
}

export interface ForecastOutput {
  period: { from: string; to: string };
  lagna: string;
  current_dasha: CurrentDasha;
  days: DayForecast[];
  weekly_summary: string;
}
