import { db, logRun } from '../db/index';
import { envNum } from './env';

/**
 * HARD budget guard for paid AI video generation.
 *
 * The owner's TOTAL marketing budget is $100/week and video must never eat the ad money,
 * so this module is authoritative: nothing in src/render/ may call a paid provider without
 * first getting an `allowed: true` from `checkBudget()`. Every generation — successful,
 * failed, or refused — is written to the `video_spend` table so the caps are computed from
 * real history rather than from an in-process counter that a crash could lose.
 */

export interface BudgetCaps {
  perRunUsd: number;
  perDayUsd: number;
  perWeekUsd: number;
}

/** Caps, overridable per-environment. Defaults are deliberately small. */
export function caps(): BudgetCaps {
  return {
    // 4.00 leaves headroom over the ~$3.02 reference reel (8s Veo + 5s Kling + 5s Wan + 6s Veo)
    // without allowing a runaway multi-shot creative through.
    perRunUsd: envNum('VIDEO_BUDGET_RUN_USD', 4.0),
    perDayUsd: envNum('VIDEO_BUDGET_DAY_USD', 6.0),
    perWeekUsd: envNum('VIDEO_BUDGET_WEEK_USD', 35.0),
  };
}

export interface SpendRow {
  run_id: string;
  slug?: string | null;
  shot_id?: string | null;
  provider: string;
  model?: string | null;
  seconds?: number;
  cost_usd?: number;
  estimated_usd?: number;
  status?: 'ok' | 'error' | 'refused' | 'dry';
  detail?: string | null;
}

/** Record one generation attempt. The ONLY writer to video_spend. */
export function recordSpend(r: SpendRow): void {
  db()
    .prepare(
      `INSERT INTO video_spend (run_id, slug, shot_id, provider, model, seconds, cost_usd, estimated_usd, status, detail)
       VALUES (@run_id, @slug, @shot_id, @provider, @model, @seconds, @cost_usd, @estimated_usd, @status, @detail)`,
    )
    .run({
      run_id: r.run_id,
      slug: r.slug ?? null,
      shot_id: r.shot_id ?? null,
      provider: r.provider,
      model: r.model ?? null,
      seconds: r.seconds ?? 0,
      cost_usd: r.cost_usd ?? 0,
      estimated_usd: r.estimated_usd ?? 0,
      status: r.status ?? 'ok',
      detail: r.detail ?? null,
    });
}

function sum(where: string, params: any[] = []): number {
  const row = db()
    .prepare(`SELECT COALESCE(SUM(cost_usd), 0) AS s FROM video_spend WHERE status IN ('ok','error') AND ${where}`)
    .get(...params) as { s: number };
  return Number(row?.s ?? 0);
}

export interface SpendSnapshot {
  runUsd: number;
  dayUsd: number;
  weekUsd: number;
}

/**
 * Spend so far. Day = rolling 24h, week = rolling 7d (not calendar buckets — a rolling
 * window can't be gamed by rendering at 23:55 and again at 00:05).
 */
export function spendSnapshot(runId: string): SpendSnapshot {
  return {
    runUsd: sum('run_id = ?', [runId]),
    dayUsd: sum("ts >= datetime('now','-1 day')"),
    weekUsd: sum("ts >= datetime('now','-7 day')"),
  };
}

export interface BudgetDecision {
  allowed: boolean;
  reason: string;
  caps: BudgetCaps;
  spent: SpendSnapshot;
  headroomUsd: number;
}

/**
 * Ask permission to spend `estimateUsd` on this run. REFUSES (and logs the refusal to both
 * runs_log and video_spend) if any of the three caps would be breached. Callers must not
 * proceed on `allowed: false`.
 */
export function checkBudget(runId: string, estimateUsd: number, ctx: { slug?: string; shotId?: string; provider?: string } = {}): BudgetDecision {
  const c = caps();
  const spent = spendSnapshot(runId);
  const headroomUsd = round(Math.min(c.perRunUsd - spent.runUsd, c.perDayUsd - spent.dayUsd, c.perWeekUsd - spent.weekUsd));

  let reason = '';
  if (estimateUsd < 0 || !Number.isFinite(estimateUsd)) reason = `invalid estimate ${estimateUsd}`;
  else if (spent.runUsd + estimateUsd > c.perRunUsd)
    reason = `per-RUN cap: $${round(spent.runUsd)} spent + $${round(estimateUsd)} > $${c.perRunUsd.toFixed(2)}`;
  else if (spent.dayUsd + estimateUsd > c.perDayUsd)
    reason = `per-DAY cap (rolling 24h): $${round(spent.dayUsd)} spent + $${round(estimateUsd)} > $${c.perDayUsd.toFixed(2)}`;
  else if (spent.weekUsd + estimateUsd > c.perWeekUsd)
    reason = `per-WEEK cap (rolling 7d): $${round(spent.weekUsd)} spent + $${round(estimateUsd)} > $${c.perWeekUsd.toFixed(2)}`;

  if (reason) {
    recordSpend({
      run_id: runId,
      slug: ctx.slug,
      shot_id: ctx.shotId,
      provider: ctx.provider ?? 'budget',
      cost_usd: 0,
      estimated_usd: estimateUsd,
      status: 'refused',
      detail: reason,
    });
    logRun({ loop: 'render', status: 'skipped', detail: `budget refused: ${reason}` });
    return { allowed: false, reason, caps: c, spent, headroomUsd };
  }
  return { allowed: true, reason: `ok — $${round(headroomUsd)} headroom`, caps: c, spent, headroomUsd };
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Human-readable budget line for the CLI and for PUBLISH.md. */
export function budgetLine(runId: string): string {
  const c = caps();
  const s = spendSnapshot(runId);
  return (
    `budget — run $${s.runUsd.toFixed(2)}/$${c.perRunUsd.toFixed(2)} · ` +
    `24h $${s.dayUsd.toFixed(2)}/$${c.perDayUsd.toFixed(2)} · ` +
    `7d $${s.weekUsd.toFixed(2)}/$${c.perWeekUsd.toFixed(2)}`
  );
}
