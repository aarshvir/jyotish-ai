import { brain, type Tier } from '../brain/index';
import { recordReviewSpend } from './store';
import { extractJson, failedReport, normalizeReport, JSON_CONTRACT, type LensReport } from './types';
import { dossier, type ReelArtifacts } from './artifacts';

/**
 * One reviewer pass, routed through the $0 CLI subscriptions (project law §3: subscription
 * before any metered API). Both the codex CLI and the claude CLI were probed on 2026-07-26
 * and CAN open image files from disk, so frames are handed over as absolute paths rather than
 * base64 through a paid vision endpoint.
 */

export interface LensSpec {
  /** Short id used in REVIEW.md, e.g. "ad-craft/hook". */
  lens: string;
  stage: 'internal' | 'gpt';
  /** Tier decides which CLI answers: 'smart' → claude first, 'code' → codex (the GPT) first. */
  tier: Tier;
  /** The lens-specific brief. */
  brief: string;
  /** Attach the audit frames and demand the reviewer open them. */
  withFrames: boolean;
}

function framesBlock(a: ReelArtifacts): string {
  return `AUDIT FRAMES — open EVERY one of these image files and look at the pixels before answering.
Each is a real frame grabbed from the finished video at the stated reel time:
${a.frames.map((f) => `  ${f.label}  ${f.path}`).join('\n')}

You MUST anchor visual findings to the timestamp of the frame you saw them in.`;
}

export function buildPrompt(spec: LensSpec, a: ReelArtifacts): string {
  return `You are reviewing a finished 9:16 short-form ad for VedicHour (a Vedic astrology TIMING app, Hinglish, Indian audience) BEFORE it is published. Be the reviewer who stops a bad ad, not the one who is agreeable. The owner has rejected reels for exactly the kind of defect you are looking for.

YOUR LENS — judge ONLY this, in second-by-second detail:
${spec.brief}

${spec.withFrames ? `${framesBlock(a)}\n` : ''}
EVIDENCE
========
${dossier(a)}

${JSON_CONTRACT}`;
}

/** Run one lens. Never throws — a failed pass returns a degraded report. */
export async function runLens(spec: LensSpec, a: ReelArtifacts, runId: string): Promise<LensReport> {
  const t0 = Date.now();
  const prompt = buildPrompt(spec, a);
  try {
    const res = await brain(prompt, { tier: spec.tier, loop: `review:${spec.stage}` });
    const json = extractJson(res.text);
    const durationMs = Date.now() - t0;
    recordReviewSpend({
      run_id: runId, slug: a.slug, lens: spec.lens, provider: `${res.cli}_cli`, model: res.model,
      images: spec.withFrames ? a.frames.length : 0, cost_usd: 0,
      status: json ? 'ok' : 'error', detail: json ? `${res.text.length} chars` : 'unparseable JSON',
    });
    if (!json) {
      return failedReport({ lens: spec.lens, stage: spec.stage, source: res.cli, durationMs }, `${res.cli} returned no parseable JSON`);
    }
    return normalizeReport(json, { lens: spec.lens, stage: spec.stage, source: res.cli, durationMs });
  } catch (e: any) {
    const durationMs = Date.now() - t0;
    const msg = String(e?.message ?? e);
    recordReviewSpend({ run_id: runId, slug: a.slug, lens: spec.lens, provider: 'cli', cost_usd: 0, status: 'error', detail: msg.slice(0, 200) });
    return failedReport({ lens: spec.lens, stage: spec.stage, source: 'cli', durationMs }, msg);
  }
}

/** Run tasks with bounded concurrency, preserving input order in the result. */
export async function pool<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}
