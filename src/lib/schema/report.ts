/**
 * Canonical report schema barrel — single import source for all report-related types.
 *
 * ARCHITECTURE:
 *   - Persisted report shape: re-exported from agents/types.ts (unchanged)
 *   - V2 guidance layer: additive optional fields (SlotGuidanceV2, DayBriefingV2)
 *   - Route DTOs: shared request/response shapes for commentary/validation/PDF routes
 *   - PDF adapter shape: derived from canonical ReportData
 *
 * Import from here, not from agents/types.ts directly, for new code.
 */

// ── Re-export canonical persisted types ──────────────────────────────────────
export type {
  NatalChartInput,
  PlanetData,
  AntardashaEntry,
  DashaEntry,
  CurrentDasha,
  NatalChartData,
  PanchangData,
  HoraEntry,
  ChoghadiyaEntry,
  RahuKaalData,
  FullDayData,
  Yoga,
  PlanetaryPosition,
  NativityProfile,
  RatingLabel,
  RatedSlot,
  DayRating,
  ForecastInput,
  DayNarrative,
  AgentDayForecast,
  ForecastOutput,
  DomainScores,
  HoraSlot,
  DayForecast,
  WeekSummary,
  MonthSummary,
  SynthesisDateEntry,
  PeriodSynthesis,
  NativityData,
  ReportData,
} from '@/lib/agents/types';

// ── V2 guidance layer types ──────────────────────────────────────────────────
export type {
  GuidanceLabel,
  ActionCategory,
  ReasonTag,
  SlotGuidanceV2,
  DayBriefingV2,
} from '@/lib/guidance/types';

// ── Centralized label logic ──────────────────────────────────────────────────
export {
  getCanonicalScoreLabel,
  getGuidanceLabel,
  SCORE_LABEL_THRESHOLDS,
  GUIDANCE_LABEL_MAP,
  getLabelColor,
  getLabelIcon,
} from '@/lib/guidance/labels';

// ── Route DTOs ───────────────────────────────────────────────────────────────
export type {
  HourlyDayRequestDTO,
  HourlyDayResponseDTO,
  DailyOverviewRequestDTO,
  DailyOverviewResponseDTO,
  PdfReportPayload,
} from '@/lib/schema/dtos';

// ── Feature flag ─────────────────────────────────────────────────────────────
export { isV2GuidanceEnabled } from '@/lib/guidance/featureFlag';
