/**
 * V2 Guidance Layer Types
 *
 * Additive types that extend the report model for decision-support output.
 * These are OPTIONAL fields on HoraSlot / DayForecast — old reports without
 * them continue to render normally.
 */

export type GuidanceLabel =
  | 'excellent'
  | 'strong'
  | 'mixed'
  | 'caution'
  | 'delay_if_possible';

export type ActionCategory =
  | 'deep_work'
  | 'communication'
  | 'money'
  | 'relationships'
  | 'travel'
  | 'creative'
  | 'spiritual'
  | 'admin';

export const ALL_ACTION_CATEGORIES: ActionCategory[] = [
  'deep_work',
  'communication',
  'money',
  'relationships',
  'travel',
  'creative',
  'spiritual',
  'admin',
];

export interface ReasonTag {
  code: string;
  label: string;
  direction: 'supportive' | 'mixed' | 'challenging';
  weight: number;
  detail: string;
}

export interface SlotGuidanceV2 {
  score: number;
  label: GuidanceLabel;
  reason_tags: ReasonTag[];
  category_scores: Record<ActionCategory, number>;
  best_for: string[];
  avoid_for: string[];
  still_ok_for: string[];
  if_unavoidable: string;
  summary_plain: string;
  summary_astrology?: string;
}

export interface DayBriefingV2 {
  theme: string;
  top_windows: number[];
  caution_windows: number[];
  best_overall_for: string[];
  not_ideal_for: string[];
  why_today: string;
  current_phase_context?: string;
}
