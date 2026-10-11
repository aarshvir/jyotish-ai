/**
 * Report quality tiers: which model writes which part of a 30-day forecast.
 *
 * One setting, REPORT_TIER, in Vercel:
 *   current   (the default, and what runs today) every route uses the model order it always has.
 *   standard  Claude Sonnet 5.5 writes the reading (nativity, daily, months, weeks), Claude Haiku 5.5
 *             writes the hourly prose. Measured about $0.60 for a first run (never above $0.65).
 *   premium   Claude Opus 5.5 writes the reading, Sonnet 5.5 the hourly prose. An estimate, not yet a
 *             measurement: about $2.3 up front, about $3.2 if every day is opened, and the $5 ceiling
 *             covers retries. Calibrate with scripts/report-cost-probe.ts before selling it.
 *
 * An explicit per-route variable (REPORT_HOURLY_BATCH_MODEL, REPORT_MONTHLY_MODEL, REPORT_DAILY_MODEL,
 * REPORT_WEEKS_MODEL, REPORT_NATIVITY_MODEL) always beats the tier, and a model named in a request
 * body beats both. Whatever a tier chooses, the owner's model order stays behind it as the fallback.
 *
 * ---------------------------------------------------------------------------------------------------
 * MEASURED COST OF ONE 30-DAY FORECAST (2026-10-11, scripts/report-cost-probe.ts, one invented person,
 * the real commentary routes and the real ephemeris, tokens priced at list price by src/lib/llm/cost.ts,
 * no database key loaded so nothing was written anywhere)
 *
 *   Part                          calls  current order*   standard (measured)   premium (estimate)
 *   Nativity reading                1    $0.32            $0.058                ~$0.26
 *   Daily overviews, 30 days        5    ~$1.80           $0.34  (5 x $0.0675)  ~$0.97
 *   Hourly prose, first 10 days     5    $0.23            $0.022 ($0.0022/day)  ~$0.45
 *   Months 1 to 12                  4    $0.57            $0.133                ~$0.45
 *   Weeks and synthesis             1    ~$0.20           $0.043                ~$0.16
 *   First run                            about $3.1       about $0.60           about $2.3
 *   Each further day opened later        $0.023           $0.0022               ~$0.045
 *   Worst case, every day opened         ~$3.4            ~$0.65                ~$3.2
 *
 *   * "current order" means the owner's order (GPT-5.6-terra, Claude Opus 5, Grok, DeepSeek) when its
 *     first rung cannot answer. The OpenAI key on the measuring machine had no credit (every call was
 *     HTTP 429), so Opus 5 was tried next. On daily overviews Opus 5 spends its 10,000-token cap on
 *     thinking and is cut off; a cut-off reply is still billed, is discarded, and the same chunk is then
 *     re-run on DeepSeek. One 6-day chunk cost $0.36 that way, of which $0.343 was thrown away. The
 *     $1.00 per forecast in PRICING_RESEARCH.md (2026-09-13) predates this and was measured when the
 *     first rung answered; check whether production's OpenAI key has credit. Discarded calls used to
 *     leave no usage log line at all, so any cost summed from logs was low. They are now logged with
 *     "wasted": true (modelChain.ts).
 *   "premium" is Opus 5 token counts priced at Opus 5.5's list price ($4 in, $20 out per million) with
 *     no thinking overhead added. It has not been run.
 *   The quiz personalisation adds about 800 input tokens a call: under a cent on every tier.
 *   Sonnet 5.5 and Haiku 5.5 are called with up-front thinking off (anthropicTuning.ts); with it on, the
 *   first Sonnet 5.5 call was cut off at 4,800 tokens. Opus 5 and 5.5 cannot switch thinking off;
 *   LLM_ANTHROPIC_EFFORT=medium (or low) makes them think less.
 *
 * WHAT IS WRITTEN WHEN
 *   With the report: nativity, all 30 daily overviews, all 12 months, the 6 weeks, the synthesis, and the
 *   first REPORT_HOURLY_PROSE_DAYS days (default 10) of hourly prose.
 *   Later days of hourly prose are written when their reader first opens them
 *   (/api/reports/[id]/hourly-day), by the same tier's hourly model, and saved on the report. On Haiku 5.5
 *   a day costs about a fifth of a cent, so a reader who opens every day adds about 4 cents.
 *   Thirty days up front would need 5-day batches, which overran the output limit on Haiku 4.5; at
 *   Haiku 5.5 prices there is no money reason to wait, only the six fixed steps of the background job.
 *
 * WHAT A $5 TIER WOULD BUY (owner's $5 to $7 first-run budget; it only fits the Rs 999 / $14.99 plan)
 *   Premium spends about $2.3, leaving about $2.7 for: retries (one cut-off Opus call is $0.30 to $0.35);
 *   the other 20 days of hourly prose on Sonnet 5.5 written up front instead of on demand (about $0.90,
 *   needs a third pass of hourly steps in src/lib/inngest/functions.ts, not built); and the Karmic
 *   Blueprint for the reader's focus area (about $0.07). Without those, premium is a better-model tier,
 *   not a bigger-report tier, and its quality gain over standard has not been measured.
 *
 * RECOMMENDATION: set REPORT_TIER=standard after reading three real reports side by side with the
 * current ones. Keep GPT-5.6-terra only where it is shown to be worth its price.
 *
 * TO MEASURE AGAIN (nothing reaches a database: the dev server below has a dummy Supabase address)
 *   cd ephemeris-service && python -m uvicorn main:app --port 8000
 *   BYPASS_SECRET=probe-local NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:1 NEXT_PUBLIC_SUPABASE_ANON_KEY=x \
 *     EPHEMERIS_SERVICE_URL=http://127.0.0.1:8000 ANTHROPIC_API_KEY=... REPORT_TIER=standard \
 *     npx next dev -p 3217 > next.log 2>&1
 *   npx tsx scripts/report-cost-probe.ts --who asha --log next.log --routes nativity,daily,months,weeks
 *   npx tsx scripts/report-cost-probe.ts --who asha --log next.log --routes hourly --hourly-days 2
 * Costs are summed from the llm_usage lines the server logs, including discarded ones. Prices live in
 * src/lib/llm/cost.ts; update the table when a provider changes one.
 * ---------------------------------------------------------------------------------------------------
 */

export type ReportTier = 'current' | 'standard' | 'premium';
export type TierRoute = 'nativity' | 'nativityText' | 'daily' | 'hourly' | 'months' | 'weeks';

export const TIER_MODELS: Record<ReportTier, Partial<Record<TierRoute, string>>> = {
  current: {},
  standard: {
    nativity: 'claude-sonnet-5-5',
    nativityText: 'claude-sonnet-5-5',
    daily: 'claude-sonnet-5-5',
    hourly: 'claude-haiku-5-5',
    months: 'claude-sonnet-5-5',
    weeks: 'claude-sonnet-5-5',
  },
  premium: {
    nativity: 'claude-opus-5-5',
    nativityText: 'claude-opus-5-5',
    daily: 'claude-opus-5-5',
    hourly: 'claude-sonnet-5-5',
    months: 'claude-opus-5-5',
    weeks: 'claude-opus-5-5',
  },
};

/** The env variable that pins one route on purpose, ahead of any tier. */
export const ROUTE_ENV: Record<TierRoute, string> = {
  nativity: 'REPORT_NATIVITY_MODEL',
  nativityText: 'REPORT_NATIVITY_MODEL',
  daily: 'REPORT_DAILY_MODEL',
  hourly: 'REPORT_HOURLY_BATCH_MODEL',
  months: 'REPORT_MONTHLY_MODEL',
  weeks: 'REPORT_WEEKS_MODEL',
};

type Env = Record<string, string | undefined>;

export function resolveReportTier(env: Env = process.env): ReportTier {
  const v = (env.REPORT_TIER ?? '').trim().toLowerCase();
  return v === 'standard' || v === 'premium' ? v : 'current';
}

/**
 * The model a route should use when its request does not name one, or undefined to leave the route on
 * its own default. An unset or blank per-route variable falls through to the tier.
 */
export function tierModel(route: TierRoute, env: Env = process.env): string | undefined {
  const pinned = (env[ROUTE_ENV[route]] ?? '').trim();
  if (pinned) return pinned;
  return TIER_MODELS[resolveReportTier(env)][route];
}
