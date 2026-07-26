import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { logRun } from '../db/index';
import { isKilled, killInfo } from '../safety/killswitch';
import { writeHeartbeat } from '../scheduler/heartbeat';
import { loadReel, listReels, reelDir, type ReelArtifacts } from './artifacts';
import { INTERNAL_LENSES } from './internal';
import { GPT_LENSES } from './gpt';
import { runLens, pool, type LensSpec } from './runner';
import { runGptApiLens } from './gpt-api';
import { hardRules } from './hardrules';
import { runPreflight } from './preflight';
import { synthesize, writeReview } from './synthesize';
import { writeFixQueue, reviewSpent } from './store';
import { fileFindingLessons, queueApproval } from './approvals';
import type { Finding, LensReport } from './types';

/**
 * THE PUBLISH GATE — `npm run loop:review -- <slug>`.
 *
 *   pre-flight ($0) -> render -> [ 4 internal audits + 5 GPT cross-reviews + 2 deterministic ]
 *   -> synthesis -> OWNER APPROVAL -> platform            (project law §5)
 *
 * All eleven passes are $0: the four internal audits run on the Claude subscription, the five
 * GPT cross-reviews on the codex CLI (both were probed and can open image files), and the two
 * deterministic passes are regexes. The metered OpenAI path exists only behind --allow-paid.
 */

export interface ReviewOpts {
  slug?: string;
  /** Allow the metered OpenAI vision API for GPT lenses the CLI could not deliver. */
  allowPaid?: boolean;
  /** Parallel CLI calls. 3 keeps wall-time sane without tripping fair-use. */
  concurrency?: number;
}

function newestReel(): string | null {
  const reels = listReels();
  if (!reels.length) return null;
  return reels
    .map((s) => ({ s, t: statSync(resolve(reelDir(s), 'publish.json')).mtimeMs }))
    .sort((a, b) => b.t - a.t)[0].s;
}

/** Re-run STAGE 0 against the plan this reel came from, so the review shows plan-level defects too. */
async function preflightRetro(a: ReelArtifacts): Promise<LensReport | null> {
  if (!a.creative) return null;
  const raw = a.creativeFile && existsSync(a.creativeFile) ? readFileSync(a.creativeFile, 'utf8') : null;
  const r = await runPreflight(a.creative, { file: a.creativeFile, raw });
  const findings: Finding[] = r.blocks.map((b) => ({
    timestamp: 'n/a',
    severity: 'blocker' as const,
    issue: `PRE-FLIGHT (${b.rule}) ${b.where}${b.line ? `:${b.line}` : ''} — ${b.detail}`,
    fix: b.fix,
    lens: 'pre-flight (retro)',
    stage: 'deterministic',
  }));
  return {
    lens: 'pre-flight (retro, on the creative plan)',
    stage: 'deterministic',
    source: 'rules',
    verdict: r.ok ? 'ship' : 'block',
    findings,
    oneLiner: r.ok
      ? 'The plan this reel came from passes pre-flight.'
      : `The plan this reel came from would be BLOCKED today: ${r.blocks.length} hard-rule violation(s).`,
    ok: true,
    costUsd: 0,
    durationMs: 0,
  };
}

export async function runReviewLoop(opts: ReviewOpts = {}): Promise<void> {
  const loop = 'review';
  if (isKilled()) {
    console.log(`[review] KILL-SWITCH engaged (${killInfo()?.reason}) — skipping.`);
    logRun({ loop, status: 'killed', detail: killInfo()?.reason ?? 'kill-switch' });
    return;
  }

  const slug = opts.slug || newestReel();
  if (!slug) {
    console.log('[review] no rendered reels found in output/reels/.');
    logRun({ loop, status: 'skipped', detail: 'no reels' });
    return;
  }

  const runId = randomUUID().slice(0, 8);
  logRun({ loop, status: 'started', detail: `${slug} (run ${runId})` });

  let a: ReelArtifacts;
  try {
    a = loadReel(slug);
  } catch (e: any) {
    console.error(`[review] ${String(e?.message ?? e)}`);
    logRun({ loop, status: 'error', detail: String(e?.message ?? e).slice(0, 200) });
    return;
  }

  const conc = Math.max(1, opts.concurrency ?? 3);
  console.log(`\n[review] ${slug} — ${a.durationSec}s, ${a.frames.length} audit frames · run ${runId}`);
  console.log(`[review] STAGE 1: ${INTERNAL_LENSES.length} internal audits ($0, claude CLI first)`);
  console.log(`[review] STAGE 2: ${GPT_LENSES.length} GPT cross-reviews ($0, codex CLI — subscription, not the metered API)`);
  if (opts.allowPaid) console.log('[review] PAID FALLBACK ENABLED — the metered OpenAI API may be used for GPT lenses the CLI cannot deliver (cap $0.25/reel).');

  const deterministic: LensReport[] = [hardRules(a)];
  const retro = await preflightRetro(a);
  if (retro) deterministic.push(retro);
  for (const d of deterministic) console.log(`[review]   ✓ ${d.lens} — ${d.verdict.toUpperCase()} (${d.findings.length} findings)`);

  const run = async (spec: LensSpec) => {
    const r = await runLens(spec, a, runId);
    console.log(`[review]   ${r.ok ? '✓' : '✗'} ${spec.lens} — ${r.ok ? `${r.verdict.toUpperCase()} (${r.findings.length} findings, ${r.source}, ${(r.durationMs / 1000).toFixed(0)}s)` : r.error}`);
    return r;
  };

  const internal = await pool(INTERNAL_LENSES, conc, run);
  let gpt = await pool(GPT_LENSES, conc, run);

  // Metered fallback — only for lenses the subscription failed to deliver, and only on request.
  if (opts.allowPaid) {
    gpt = await pool(gpt, 2, async (r, i) => {
      if (r.ok) return r;
      console.log(`[review]   retrying ${GPT_LENSES[i].lens} on the PAID OpenAI API...`);
      const paid = await runGptApiLens(GPT_LENSES[i], a, runId);
      return paid.ok ? paid : r;
    });
  }

  const lenses = [...internal, ...gpt, ...deterministic];
  const bundle = synthesize(a, lenses, runId);
  writeReview(a, bundle);
  writeFixQueue(slug, runId, bundle.fixQueue);
  queueApproval(slug, bundle.verdict, bundle.reviewPath);
  const lessons = await fileFindingLessons(slug, bundle.findings);

  const spent = reviewSpent(slug);
  console.log('');
  console.log('='.repeat(72));
  console.log(`VERDICT: ${bundle.verdict.toUpperCase().replace(/_/g, ' ')}`);
  console.log(`REASON:  ${bundle.reason}`);
  console.log(`FINDINGS: ${bundle.counts.blocker} blocker · ${bundle.counts.major} major · ${bundle.counts.minor} minor · ${bundle.counts.nit} nit`);
  console.log(`FIX QUEUE: ${bundle.fixQueue.length} auto-fixable · ${bundle.findings.filter((f) => f.fixClass === 'needs_rerender').length} need re-render · ${bundle.findings.filter((f) => f.fixClass === 'advisory').length} advisory`);
  console.log(`COST:    $${bundle.costUsd.toFixed(4)} this run · $${spent.reelUsd.toFixed(4)} on this reel all-time (cap $0.40)`);
  console.log(`LESSONS: ${lessons} filed`);
  console.log(`REVIEW:  ${bundle.reviewPath}`);
  console.log(`NEXT:    npm run approvals   ·   npm run approve ${slug}   ·   npm run reject ${slug} "reason"`);
  console.log('='.repeat(72));
  console.log('');

  logRun({
    loop,
    status: 'ok',
    detail: `${slug}: ${bundle.verdict}, ${bundle.findings.length} findings, $${bundle.costUsd.toFixed(4)}`,
  });
  writeHeartbeat(loop, `${slug} → ${bundle.verdict}`);
}
