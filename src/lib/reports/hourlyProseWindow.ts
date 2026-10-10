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

/** Hourly-batch Inngest steps available (commentary_hourly_1..6). A chunk beyond this never runs. */
export const HOURLY_BATCH_STEPS = 6;

/**
 * Days per hourly-batch LLM call. Each slot asks for 105-150 words (~160-215 tokens in JSON), so a
 * 5-day batch (90 slots, ~18k tokens) overran the 16k output cap and the parser silently filled the
 * rest with template hours — a real 7-day promo report shipped 73 of 126 template slots. Two days
 * (~7.7k tokens, ~80 s on Haiku) fits the cap and the 160 s fetch timeout. The count grows only
 * when there are more prose days than steps, so every prose day still gets a batch.
 */
export function resolveHourlyBatchDays(proseDayCount: number, steps: number = HOURLY_BATCH_STEPS): number {
  if (proseDayCount <= 0) return 2;
  return Math.max(2, Math.ceil(proseDayCount / Math.max(1, steps)));
}

/** Whether the pipeline intentionally generated hourly prose for this day. */
export function isDayInsideProseWindow(dayIndex: number, proseDayCount: number): boolean {
  return dayIndex >= 0 && dayIndex < proseDayCount;
}
