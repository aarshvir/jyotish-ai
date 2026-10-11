/**
 * What the Blueprint generator needs from the outside world, as interfaces, so the whole
 * pipeline runs in tests and in local dry-runs with no network and no database.
 */

import type { NatalChartData } from '@/lib/agents/types';

/** One day of the ephemeris engine's daily grid (the same engine that scores the forecast). */
export interface GridDay {
  date: string;
  day_score: number;
  panchang?: { tithi?: string; nakshatra?: string; yoga?: string; sunrise?: string; sunset?: string; moon_sign?: string };
  rahu_kaal?: { start: string; end: string };
  slots: { slot_index: number; display_label: string; score: number; dominant_hora?: string; dominant_choghadiya?: string; is_rahu_kaal?: boolean }[];
  planet_positions?: { planets?: Record<string, { sign: string; house?: number; degree: number }> };
  special_events?: string[];
}

export interface NatalInput {
  date: string;
  /** HH:MM:SS local time. Noon when the time is unknown. */
  time: string;
  city: string;
  lat: number;
  lng: number;
}

export interface EphemerisPort {
  natalChart(input: NatalInput): Promise<NatalChartData>;
  dailyGrid(args: { dates: string[]; lat: number; lng: number; lagnaSignIndex: number }): Promise<GridDay[]>;
}

export interface LlmUsage {
  input: number | null;
  output: number | null;
}

export interface LlmResult {
  text: string;
  model: string;
  usage: LlmUsage;
}

export interface LlmPort {
  complete(args: { system: string; user: string; maxTokens: number; stage: string }): Promise<LlmResult>;
}

export interface BlueprintDeps {
  ephemeris: EphemerisPort;
  llm: LlmPort;
}
