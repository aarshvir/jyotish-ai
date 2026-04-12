/**
 * Shared DTOs for route boundaries.
 *
 * These replace inline Record<string, unknown> and route-local interfaces.
 * All commentary / validation / PDF routes should use these.
 */

import type { DayOutcomeTier, PanchangData, RatingLabel } from '@/lib/agents/types';
import type { SlotGuidanceV2, DayBriefingV2 } from '@/lib/guidance/types';

// ── Hourly-Day Commentary Route ──────────────────────────────────────────────

export interface HourlySlotInput {
  slot_index: number;
  display_label: string;
  hora_planet: string;
  choghadiya: string;
  choghadiya_quality?: string;
  transit_lagna: string;
  transit_lagna_house: number;
  is_rahu_kaal: boolean;
  score: number;
}

export interface HourlyDayRequestDTO {
  model_override?: string;
  lagnaSign: string;
  mahadasha: string;
  antardasha: string;
  date: string;
  planet_positions?: unknown;
  panchang?: Partial<PanchangData>;
  rahu_kaal?: { start?: string; end?: string };
  slots: HourlySlotInput[];
}

export interface HourlySlotResult {
  slot_index: number;
  commentary: string;
  commentary_short?: string;
  guidance?: SlotGuidanceV2;
}

export interface HourlyDayResponseDTO {
  date: string;
  slots: HourlySlotResult[];
  partial?: boolean;
  error?: string;
}

// ── Daily Overviews Route ────────────────────────────────────────────────────

export interface DayOverviewInput {
  date: string;
  panchang: Partial<PanchangData>;
  planet_positions?: unknown;
  slots?: Array<{
    display_label?: string;
    score?: number;
    hora_planet?: string;
    dominant_hora?: string;
    choghadiya?: string;
    dominant_choghadiya?: string;
    is_rahu_kaal?: boolean;
  }>;
  day_score: number;
  rahu_kaal: { start: string; end: string };
  peak_slots?: Array<{
    display_label: string;
    hora_planet?: string;
    dominant_hora?: string;
    choghadiya?: string;
    dominant_choghadiya?: string;
    score: number;
  }>;
}

export interface DailyOverviewRequestDTO {
  model_override?: string;
  lagnaSign: string;
  mahadasha: string;
  antardasha: string;
  days: DayOverviewInput[];
}

export interface DayOverviewResult {
  date: string;
  day_theme: string;
  day_overview: string;
  briefing?: DayBriefingV2;
}

export interface DailyOverviewResponseDTO {
  days: DayOverviewResult[];
  partial?: boolean;
  error?: string;
}

// ── PDF Route ────────────────────────────────────────────────────────────────

export interface PdfSlot {
  display_label: string;
  hora_planet: string;
  choghadiya: string;
  score: number;
  label: RatingLabel;
  is_rahu_kaal: boolean;
  commentary_short: string;
  guidance?: SlotGuidanceV2;
}

export interface PdfDay {
  date: string;
  day_score: number;
  day_label_tier: DayOutcomeTier;
  day_theme: string;
  overview_short: string;
  panchang?: Partial<PanchangData>;
  rahu_kaal?: { start: string; end: string } | null;
  slots: PdfSlot[];
  briefing?: DayBriefingV2;
}

export interface PdfReportPayload {
  name: string;
  date: string;
  time: string;
  city: string;
  lagna: string;
  mahadasha?: string;
  antardasha?: string;
  nativity_summary: string;
  monthly: Array<{ month: string; commentary: string; score: number }>;
  weekly: Array<{ week_label: string; commentary: string; score: number }>;
  days: PdfDay[];
  period_synthesis: string;
}

// ── Validation Route ─────────────────────────────────────────────────────────

export interface ValidationRequestDTO {
  report: unknown;
  strict?: boolean;
}

export interface ValidationResponseDTO {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
