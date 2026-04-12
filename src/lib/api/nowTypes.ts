/** Response shape for `GET /api/now` (Sprint 2). */
export interface NowResponse {
  generated_at: string;
  /** e.g. `UTC+4` from stored `timezone_offset` minutes. */
  timezone_label: string;
  /** Same offset used for the daily grid (minutes east of UTC). */
  timezone_offset_minutes: number;
  current: {
    time_range: string;
    score: number;
    hora_ruler: string;
    choghadiya: string;
    transit_lagna: string;
    transit_house: number;
    is_rahu_kaal: boolean;
    action_directive: string;
  };
  next_peak: {
    time_range: string;
    score: number;
    hora_ruler: string;
    choghadiya: string;
    minutes_until: number;
    /** e.g. `Leo H10` */
    transit_summary: string;
  } | null;
  rahu_kaal: {
    start: string;
    end: string;
    is_active_now: boolean;
  };
  day: {
    score: number;
    label: string;
    emoji: string;
    yoga: string;
    nakshatra: string;
    tithi: string;
    moon_sign: string;
  };
}
