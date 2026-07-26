import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, logRun } from '../db/index';
import { envNum } from '../render/env';
import type { Finding } from './types';

const here = dirname(fileURLToPath(import.meta.url));

let applied = false;
/** Apply the publish-gate schema onto the shared DB. Idempotent; safe to call anywhere. */
export function auditDb() {
  const d = db();
  if (!applied) {
    d.exec(readFileSync(resolve(here, 'schema.sql'), 'utf8'));
    applied = true;
  }
  return d;
}

// ---------------------------------------------------------------------------
// Review spend ledger  (mirrors src/render/budget.ts)
// ---------------------------------------------------------------------------

export interface ReviewSpendRow {
  run_id: string;
  slug?: string | null;
  lens?: string | null;
  provider: string;
  model?: string | null;
  prompt_tokens?: number;
  completion_tokens?: number;
  images?: number;
  cost_usd?: number;
  estimated_usd?: number;
  status?: 'ok' | 'error' | 'refused';
  detail?: string | null;
}

/** Record one review call. The ONLY writer to review_spend. */
export function recordReviewSpend(r: ReviewSpendRow): void {
  auditDb()
    .prepare(
      `INSERT INTO review_spend (run_id, slug, lens, provider, model, prompt_tokens, completion_tokens, images, cost_usd, estimated_usd, status, detail)
       VALUES (@run_id, @slug, @lens, @provider, @model, @prompt_tokens, @completion_tokens, @images, @cost_usd, @estimated_usd, @status, @detail)`,
    )
    .run({
      run_id: r.run_id,
      slug: r.slug ?? null,
      lens: r.lens ?? null,
      provider: r.provider,
      model: r.model ?? null,
      prompt_tokens: r.prompt_tokens ?? 0,
      completion_tokens: r.completion_tokens ?? 0,
      images: r.images ?? 0,
      cost_usd: r.cost_usd ?? 0,
      estimated_usd: r.estimated_usd ?? 0,
      status: r.status ?? 'ok',
      detail: r.detail ?? null,
    });
}

/** Paid review spend on this reel so far (all runs), and in the last 24h across all reels. */
export function reviewSpent(slug: string): { reelUsd: number; dayUsd: number } {
  const d = auditDb();
  const reel = d
    .prepare(`SELECT COALESCE(SUM(cost_usd),0) s FROM review_spend WHERE slug = ? AND status IN ('ok','error')`)
    .get(slug) as { s: number };
  const day = d
    .prepare(`SELECT COALESCE(SUM(cost_usd),0) s FROM review_spend WHERE status IN ('ok','error') AND ts >= datetime('now','-1 day')`)
    .get() as { s: number };
  return { reelUsd: Number(reel?.s ?? 0), dayUsd: Number(day?.s ?? 0) };
}

export interface ReviewBudgetDecision {
  allowed: boolean;
  reason: string;
  reelCapUsd: number;
  dayCapUsd: number;
  spent: { reelUsd: number; dayUsd: number };
}

/**
 * Ask permission to spend `estimateUsd` reviewing `slug`.
 *
 * The mandate is a $0.40 hard ceiling per reel; the paid path is additionally self-capped at
 * $0.25 (see src/audit/gpt-api.ts) because the CLI subscriptions do this work for free.
 * Callers MUST NOT proceed on allowed:false.
 */
export function checkReviewBudget(runId: string, slug: string, estimateUsd: number, lens?: string): ReviewBudgetDecision {
  const reelCapUsd = envNum('REVIEW_BUDGET_REEL_USD', 0.4);
  const dayCapUsd = envNum('REVIEW_BUDGET_DAY_USD', 2.0);
  const spent = reviewSpent(slug);

  let reason = '';
  if (!Number.isFinite(estimateUsd) || estimateUsd < 0) reason = `invalid estimate ${estimateUsd}`;
  else if (spent.reelUsd + estimateUsd > reelCapUsd)
    reason = `per-REEL review cap: $${spent.reelUsd.toFixed(4)} spent + $${estimateUsd.toFixed(4)} > $${reelCapUsd.toFixed(2)}`;
  else if (spent.dayUsd + estimateUsd > dayCapUsd)
    reason = `per-DAY review cap (rolling 24h): $${spent.dayUsd.toFixed(4)} + $${estimateUsd.toFixed(4)} > $${dayCapUsd.toFixed(2)}`;

  if (reason) {
    recordReviewSpend({ run_id: runId, slug, lens, provider: 'budget', estimated_usd: estimateUsd, status: 'refused', detail: reason });
    logRun({ loop: 'review', status: 'skipped', detail: `review budget refused: ${reason}` });
    return { allowed: false, reason, reelCapUsd, dayCapUsd, spent };
  }
  return { allowed: true, reason: `ok — $${(reelCapUsd - spent.reelUsd).toFixed(4)} reel headroom`, reelCapUsd, dayCapUsd, spent };
}

// ---------------------------------------------------------------------------
// Fix queue
// ---------------------------------------------------------------------------

/** Replace this reel's OPEN auto-fix rows with the findings from the newest review. */
export function writeFixQueue(slug: string, runId: string, findings: Finding[]): number {
  const d = auditDb();
  const tx = d.transaction(() => {
    d.prepare(`UPDATE fix_queue SET status='dismissed' WHERE slug=? AND status='open'`).run(slug);
    const ins = d.prepare(
      `INSERT INTO fix_queue (slug, run_id, lens, severity, timestamp, issue, fix, fix_class)
       VALUES (@slug, @run_id, @lens, @severity, @timestamp, @issue, @fix, @fix_class)`,
    );
    for (const f of findings) {
      ins.run({
        slug,
        run_id: runId,
        lens: f.lens ?? null,
        severity: f.severity,
        timestamp: f.timestamp,
        issue: f.issue,
        fix: f.fix,
        fix_class: f.fixClass ?? 'auto_fixable',
      });
    }
  });
  tx();
  return findings.length;
}

export function openFixes(slug: string): any[] {
  return auditDb().prepare(`SELECT * FROM fix_queue WHERE slug=? AND status='open' ORDER BY id`).all(slug);
}

// ---------------------------------------------------------------------------
// Pre-flight log
// ---------------------------------------------------------------------------

export function recordPreflight(slug: string, ok: boolean, blocks: number, warnings: number, detail: unknown): void {
  auditDb()
    .prepare(`INSERT INTO preflight_runs (slug, ok, blocks, warnings, detail) VALUES (?,?,?,?,?)`)
    .run(slug, ok ? 1 : 0, blocks, warnings, JSON.stringify(detail).slice(0, 20000));
}
