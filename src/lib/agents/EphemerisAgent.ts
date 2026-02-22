/**
 * EphemerisAgent
 * Thin typed wrapper around the FastAPI ephemeris service running at
 * EPHEMERIS_API_URL (defaults to http://localhost:8000 for local dev).
 */

import type {
  NatalChartInput,
  NatalChartData,
  PanchangData,
  HoraEntry,
  ChoghadiyaEntry,
  RahuKaalData,
  FullDayData,
} from './types';

interface DayInput {
  date: string;
  lat: number;
  lng: number;
  timezone_offset: number;
}

interface FullDayInput {
  date: string;
  birth_lat: number;
  birth_lng: number;
  current_lat: number;
  current_lng: number;
  timezone_offset: number;
}

export class EphemerisAgent {
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl =
      baseUrl ??
      process.env.EPHEMERIS_API_URL ??
      'http://localhost:8000';
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`EphemerisAgent ${path} → HTTP ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  /** Full birth chart with planets, lagna, dasha sequence. */
  getNatalChart(input: NatalChartInput): Promise<NatalChartData> {
    return this.post<NatalChartData>('/natal-chart', input);
  }

  /** Daily panchang (tithi, nakshatra, yoga, sunrise/sunset…). */
  getPanchang(
    date: string,
    lat: number,
    lng: number,
    timezoneOffset: number
  ): Promise<PanchangData> {
    const body: DayInput = { date, lat, lng, timezone_offset: timezoneOffset };
    return this.post<PanchangData>('/panchang', body);
  }

  /** 24-entry hora schedule (12 day + 12 night planetary hours). */
  getHoraSchedule(
    date: string,
    lat: number,
    lng: number,
    timezoneOffset: number
  ): Promise<HoraEntry[]> {
    const body: DayInput = { date, lat, lng, timezone_offset: timezoneOffset };
    return this.post<HoraEntry[]>('/hora-schedule', body);
  }

  /** 16-entry choghadiya schedule (8 day + 8 night). */
  getChoghadiya(
    date: string,
    lat: number,
    lng: number,
    timezoneOffset: number
  ): Promise<ChoghadiyaEntry[]> {
    const body: DayInput = { date, lat, lng, timezone_offset: timezoneOffset };
    return this.post<ChoghadiyaEntry[]>('/choghadiya', body);
  }

  /** Rahu Kaal window for the day. */
  getRahuKaal(
    date: string,
    lat: number,
    lng: number,
    timezoneOffset: number
  ): Promise<RahuKaalData> {
    const body: DayInput = { date, lat, lng, timezone_offset: timezoneOffset };
    return this.post<RahuKaalData>('/rahu-kaal', body);
  }

  /**
   * Full-day bundle: panchang + hora + choghadiya + rahu kaal in one call.
   * birth_lat/lng = permanent residence (used for reference);
   * current_lat/lng = where the person is today.
   */
  getFullDayData(input: {
    date: string;
    birthLat: number;
    birthLng: number;
    currentLat: number;
    currentLng: number;
    timezoneOffset: number;
  }): Promise<FullDayData> {
    const body: FullDayInput = {
      date: input.date,
      birth_lat: input.birthLat,
      birth_lng: input.birthLng,
      current_lat: input.currentLat,
      current_lng: input.currentLng,
      timezone_offset: input.timezoneOffset,
    };
    return this.post<FullDayData>('/full-day-data', body);
  }
}
