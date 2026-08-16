/**
 * Which weeks may be shown in a report's 6-week outlook.
 *
 * HONESTY RULE: a weekly score is either computed by the pipeline or not shown.
 * WeeklyAnalysis used to pad the list to a fixed six with a hardcoded `score: 65`
 * placeholder, so a report with two computed weeks displayed four invented ones —
 * the same fabrication class as the "65 65 65" MonthlyAnalysis defect.
 *
 * Extracted from the component so the rule is test-locked (the vitest harness is
 * node-environment and cannot render TSX).
 */

export interface WeekData {
  week_label: string;
  week_start: string;
  score: number;
  theme: string;
  commentary: string;
  daily_scores?: number[];
  moon_journey?: string[];
  peak_days_count?: number;
  caution_days_count?: number;
}

/**
 * Keep only weeks carrying a real, finite computed score. Never pads, never
 * substitutes a default score.
 */
export function selectComputedWeeks(weeks: readonly (WeekData | null | undefined)[] | null | undefined): WeekData[] {
  return (weeks ?? []).filter(
    (w): w is WeekData => !!w && typeof w.score === 'number' && Number.isFinite(w.score),
  );
}
