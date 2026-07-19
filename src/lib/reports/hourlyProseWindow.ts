/**
 * Bounded-window hourly-prose sizing — the knob that keeps report generation under
 * 10 minutes. Extracted from the orchestrator so it has ONE source of truth and a
 * regression test: a bad change here silently reverts reports to ~27 min (generate
 * every day up front) or drops prose for days the pipeline should cover.
 */

/** How many days of full AI hourly prose to generate up front (env-configured). */
export function resolveHourlyProseDays(envValue: string | undefined): number {
  const raw = (envValue ?? '').trim();
  if (raw === '') return 10; // default: bound to the first 10 days
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 10; // invalid / negative → default
}

/**
 * Actual number of forecast days to generate prose for.
 * `proseDays === 0` means "no bound" → every day (restores old behavior).
 * Otherwise clamp to the days available.
 */
export function resolveProseDayCount(proseDays: number, totalDays: number): number {
  if (totalDays <= 0) return 0;
  return proseDays > 0 ? Math.min(proseDays, totalDays) : totalDays;
}

/** Whether the pipeline intentionally generated hourly prose for this day. */
export function isDayInsideProseWindow(dayIndex: number, proseDayCount: number): boolean {
  return dayIndex >= 0 && dayIndex < proseDayCount;
}
