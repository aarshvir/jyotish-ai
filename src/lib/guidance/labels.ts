/**
 * Centralized score-to-label mapping — SINGLE SOURCE OF TRUTH.
 *
 * Every layer that needs a label from a score MUST use these functions.
 * Do NOT define local getScoreLabel / toLabel functions elsewhere.
 *
 * Thresholds match RatingAgent.getScoreLabel exactly:
 *   ≥85 Peak, ≥75 Excellent, ≥65 Good, ≥50 Neutral, ≥45 Caution, ≥35 Difficult, else Avoid
 */

import type { DayOutcomeTier, RatingLabel } from '@/lib/agents/types';
import type { GuidanceLabel } from './types';

export const SCORE_LABEL_THRESHOLDS: Array<{ min: number; label: RatingLabel }> = [
  { min: 85, label: 'Peak' },
  { min: 75, label: 'Excellent' },
  { min: 65, label: 'Good' },
  { min: 50, label: 'Neutral' },
  { min: 45, label: 'Caution' },
  { min: 35, label: 'Difficult' },
  { min: 0, label: 'Avoid' },
];

/**
 * Canonical score-to-label. Rahu Kaal always overrides to Avoid.
 * This replaces ALL local getScoreLabel / toLabel functions.
 */
export function getCanonicalScoreLabel(score: number, isRahuKaal = false): RatingLabel {
  if (isRahuKaal) return 'Avoid';
  for (const { min, label } of SCORE_LABEL_THRESHOLDS) {
    if (score >= min) return label;
  }
  return 'Avoid';
}

/**
 * Whole-day score label (fixed bands). Hourly slots still use {@link getCanonicalScoreLabel}.
 * Bands: [0,20) AVOID … [80,100] EXCELLENT (see product contract).
 */
export function getDayOutcomeTier(score: number): { tier: DayOutcomeTier; emoji: string } {
  const s = Math.round(Number(score));
  if (s >= 80) return { tier: 'EXCELLENT', emoji: '⭐' };
  if (s >= 65) return { tier: 'FAVORABLE', emoji: '🟢' };
  if (s >= 50) return { tier: 'MODERATE', emoji: '🔵' };
  if (s >= 35) return { tier: 'CAUTION', emoji: '🟡' };
  if (s >= 20) return { tier: 'CHALLENGING', emoji: '🟠' };
  return { tier: 'AVOID', emoji: '🔴' };
}

export function formatDayOutcomeLabel(score: number): string {
  const { tier, emoji } = getDayOutcomeTier(score);
  return `${emoji} ${tier}`;
}

/**
 * Map from 7-tier RatingLabel to 5-tier GuidanceLabel.
 */
export const GUIDANCE_LABEL_MAP: Record<RatingLabel, GuidanceLabel> = {
  Peak: 'excellent',
  Excellent: 'strong',
  Good: 'strong',
  Neutral: 'mixed',
  Caution: 'caution',
  Difficult: 'delay_if_possible',
  Avoid: 'delay_if_possible',
};

export function getGuidanceLabel(score: number, isRahuKaal = false): GuidanceLabel {
  const ratingLabel = getCanonicalScoreLabel(score, isRahuKaal);
  return GUIDANCE_LABEL_MAP[ratingLabel];
}

/**
 * UI label display helpers — canonical colors and icons.
 */
export function getLabelColor(label: RatingLabel): string {
  switch (label) {
    case 'Peak':
    case 'Excellent':
      return 'text-success';
    case 'Good':
      return 'text-amber';
    case 'Neutral':
      return 'text-dust';
    case 'Caution':
      return 'text-orange-400';
    case 'Difficult':
    case 'Avoid':
      return 'text-caution';
  }
}

export function getLabelIcon(label: RatingLabel, isRahuKaal = false): string {
  if (isRahuKaal) return '⚠';
  switch (label) {
    case 'Peak': return '★★★';
    case 'Excellent': return '★★';
    case 'Good': return '★';
    case 'Neutral': return '—';
    case 'Caution': return '⚠';
    case 'Difficult': return '⚠⚠';
    case 'Avoid': return '🔴';
  }
}

export function getScoreNumColor(score: number, isRahuKaal = false): string {
  if (isRahuKaal || score < 45) return 'text-caution';
  if (score >= 65) return 'text-success';
  if (score >= 50) return 'text-amber';
  return 'text-orange-400';
}
