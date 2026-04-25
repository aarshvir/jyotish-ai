/**
 * EphemerisAgent
 * Typed wrapper around the FastAPI ephemeris service with timeouts,
 * retry logic, and graceful error handling for ECONNREFUSED.
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
import { cacheGet, cacheSet, stableCacheKey } from '@/lib/redis/cache';

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

const FETCH_TIMEOUT_MS = 60_000;

const CACHE_TTL_SECONDS = 86_400; // 24 h

export class EphemerisAgent {
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl =
      baseUrl ??
      process.env.EPHEMERIS_SERVICE_URL ??
      process.env.EPHEMERIS_API_URL ??
      'http://localhost:8000';
  }

  private async post<T>(path: string, body: unknown, retries = 1): Promise<T> {
    const cacheKey = stableCacheKey('eph', { path, body });
    const cached = await cacheGet<T>(cacheKey);
    if (cached !== null) return cached;

    let lastError: unknown = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      try {
        if (attempt > 0) console.log(`EphemerisAgent ${path} retry ${attempt}/${retries}`);

        const res = await fetch(`${this.baseUrl}${path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`EphemerisAgent ${path} → HTTP ${res.status}: ${text}`);
        }

        const result = await res.json() as T;
        await cacheSet(cacheKey, result, CACHE_TTL_SECONDS);
        return result;
      } catch (error: unknown) {
        clearTimeout(timer);
        lastError = error;

        const err = error as { cause?: { code?: string }; message?: string; name?: string };
        if (err?.cause?.code === 'ECONNREFUSED' || err?.message?.includes('ECONNREFUSED')) {
          throw new Error(
            `Ephemeris service offline at ${this.baseUrl}. Start it with: cd ephemeris-service && py -m uvicorn main:app --reload`
          );
        }

        if (err.name === 'AbortError') {
          throw new Error(`EphemerisAgent ${path} timed out after ${FETCH_TIMEOUT_MS / 1000}s`);
        }

        if (attempt < retries) continue;
      }
    }

    throw lastError instanceof Error ? lastError : new Error(`EphemerisAgent ${path} failed`);
  }

  getNatalChart(input: NatalChartInput): Promise<NatalChartData> {
    return this.post<NatalChartData>('/natal-chart', input);
  }

  getPanchang(date: string, lat: number, lng: number, timezoneOffset: number): Promise<PanchangData> {
    const body: DayInput = { date, lat, lng, timezone_offset: timezoneOffset };
    return this.post<PanchangData>('/panchang', body);
  }

  getHoraSchedule(date: string, lat: number, lng: number, timezoneOffset: number): Promise<HoraEntry[]> {
    const body: DayInput = { date, lat, lng, timezone_offset: timezoneOffset };
    return this.post<HoraEntry[]>('/hora-schedule', body);
  }

  getChoghadiya(date: string, lat: number, lng: number, timezoneOffset: number): Promise<ChoghadiyaEntry[]> {
    const body: DayInput = { date, lat, lng, timezone_offset: timezoneOffset };
    return this.post<ChoghadiyaEntry[]>('/choghadiya', body);
  }

  getRahuKaal(date: string, lat: number, lng: number, timezoneOffset: number): Promise<RahuKaalData> {
    const body: DayInput = { date, lat, lng, timezone_offset: timezoneOffset };
    return this.post<RahuKaalData>('/rahu-kaal', body);
  }

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
