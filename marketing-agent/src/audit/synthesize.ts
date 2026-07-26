import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SEVERITY_RANK, type FixClass, type Severity, type Verdict } from './policy';
import type { Finding, LensReport, ReviewBundle } from './types';
import type { ReelArtifacts } from './artifacts';

/**
 * STAGE 3 — synthesis and auto-fix routing.
 *
 * Merges every pass into ONE verdict the owner can act on, then routes each finding to who
 * can fix it: the $0 assembly path, a re-render, or nobody (advisory).
 */

/** A defect a re-render cannot avoid — bad generated footage, or the wrong words. */
const HARD_RERENDER = /\bai[- ]?(tell|artifact|generated)|lip[- ]?sync|regenerat|re-?shoot|new presenter|different (voice|narrator|speaker)|synthetic narrat|voice (switch|handover)|timbre|rewrite the script|another take/i;

/** A defect the assembly path can redo for $0: captions, bands, timing, capture target, audio levels. */
const AUTO = /caption|subtitle|\bband\b|legib|contrast|font|safe.?area|overlap|clipp?ed|timing|retime|timestamp|duration|hold|trim|extend|shorten|loudness|lufs|volume|normali[sz]|silence|dead air|\bgap\b|music bed|captur|screencap|scroll|\bpan\b|crop|placement|wordmark|re-?assembl|hashtag|position/i;

/** Weaker signals that still mean the shot itself is wrong. */
const SOFT_RERENDER = /\bshot\b|footage|prompt|presenter|script|dialogue|narration|voice/i;

export function classify(f: Finding): FixClass {
  const t = `${f.issue} ${f.fix}`;
  if (HARD_RERENDER.test(t)) return 'needs_rerender';
  if (AUTO.test(t)) return 'auto_fixable';
  if (SOFT_RERENDER.test(t)) return 'needs_rerender';
  return 'advisory';
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Collapse the same defect reported by several lenses into one row that names them all. */
function dedupe(findings: Finding[]): Finding[] {
  const byKey = new Map<string, Finding & { lenses: string[] }>();
  for (const f of findings) {
    const key = `${f.severity}|${norm(f.issue).slice(0, 55)}`;
    const hit = byKey.get(key);
    if (hit) {
      if (f.lens && !hit.lenses.includes(f.lens)) hit.lenses.push(f.lens);
      continue;
    }
    byKey.set(key, { ...f, lenses: f.lens ? [f.lens] : [] });
  }
  return [...byKey.values()].map((f) => ({ ...f, lens: f.lenses.join(' + ') }));
}

function sortFindings(a: Finding, b: Finding): number {
  const s = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
  if (s) return s;
  return (parseFloat(a.timestamp) || 999) - (parseFloat(b.timestamp) || 999);
}

export function synthesize(a: ReelArtifacts, lenses: LensReport[], runId: string): ReviewBundle {
  const findings = dedupe(lenses.flatMap((l) => l.findings)).map((f) => ({ ...f, fixClass: classify(f) })).sort(sortFindings);

  const counts = { blocker: 0, major: 0, minor: 0, nit: 0 } as Record<Severity, number>;
  for (const f of findings) counts[f.severity]++;

  const degraded = lenses.filter((l) => !l.ok).map((l) => `${l.lens}: ${l.error ?? 'failed'}`);
  const blockingLenses = lenses.filter((l) => l.ok && l.verdict === 'block');

  let verdict: Verdict;
  let reason: string;
  if (blockingLenses.length || counts.blocker) {
    verdict = 'block';
    reason = [
      counts.blocker ? `${counts.blocker} blocker-severity finding(s)` : '',
      blockingLenses.length ? `${blockingLenses.length} lens(es) returned "block" (${blockingLenses.map((l) => l.lens).join(', ')})` : '',
    ].filter(Boolean).join('; ');
  } else if (degraded.length > 3) {
    // A gate that mostly failed to run is not a pass.
    verdict = 'block';
    reason = `review is not trustworthy — ${degraded.length}/${lenses.length} passes failed to run`;
  } else if (findings.length || degraded.length) {
    verdict = 'ship_with_notes';
    reason = `${findings.length} finding(s), none blocking${degraded.length ? `; ${degraded.length} pass(es) degraded` : ''}`;
  } else {
    verdict = 'ship';
    reason = 'all passes clean';
  }

  const costUsd = Math.round(lenses.reduce((s, l) => s + l.costUsd, 0) * 1e6) / 1e6;
  const fixQueue = findings.filter((f) => f.fixClass === 'auto_fixable');

  return {
    slug: a.slug, runId, createdAt: new Date().toISOString(),
    verdict, reason, lenses, findings, counts, costUsd, degraded, fixQueue,
    reviewPath: resolve(a.dir, 'REVIEW.md'),
  };
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

const LABEL: Record<Verdict, string> = { ship: 'SHIP', ship_with_notes: 'SHIP WITH NOTES', block: 'BLOCK' };
const CLASS_LABEL: Record<FixClass, string> = {
  auto_fixable: 'auto-fixable ($0 re-assembly)',
  needs_rerender: 'needs re-render (costs money)',
  advisory: 'advisory',
};

export function renderReviewMd(a: ReelArtifacts, b: ReviewBundle): string {
  const L: string[] = [];
  L.push(`# REVIEW — ${a.slug}`);
  L.push('');
  L.push('## VERDICT');
  L.push('');
  L.push('```');
  L.push(`VERDICT: ${LABEL[b.verdict]}`);
  L.push(`REASON:  ${b.reason}`);
  L.push(`REEL:    ${a.slug} · ${a.durationSec}s · ${a.probe?.width}x${a.probe?.height}`);
  L.push(`PASSES:  ${b.lenses.length} (${b.lenses.filter((l) => l.stage === 'internal').length} internal · ${b.lenses.filter((l) => l.stage === 'gpt').length} GPT cross-review · ${b.lenses.filter((l) => l.stage === 'deterministic').length} deterministic)`);
  L.push(`FINDINGS: ${b.counts.blocker} blocker · ${b.counts.major} major · ${b.counts.minor} minor · ${b.counts.nit} nit`);
  L.push(`COST:    $${b.costUsd.toFixed(4)} (CLI subscriptions are $0; only the paid fallback bills)`);
  L.push(`STATUS:  awaiting owner approval — nothing publishes until \`npm run approve ${a.slug}\``);
  L.push('```');
  L.push('');

  L.push('## Passes');
  L.push('');
  L.push('| lens | stage | by | verdict | one-liner |');
  L.push('|---|---|---|---|---|');
  for (const l of b.lenses) {
    // A cell may not contain newlines or pipes or the table stops rendering.
    const cell = l.oneLiner.replace(/\s*\n\s*/g, ' · ').replace(/\|/g, '/').slice(0, 200);
    L.push(`| ${l.lens} | ${l.stage} | ${l.source} | **${l.ok ? LABEL[l.verdict] : 'DEGRADED'}** | ${cell} |`);
  }
  L.push('');
  if (b.degraded.length) {
    L.push('> **Degraded passes** (their silence is not a pass):');
    for (const d of b.degraded) L.push(`> - ${d.replace(/\s*\n\s*/g, ' · ')}`);
    L.push('');
  }

  L.push('## Findings');
  L.push('');
  if (!b.findings.length) {
    L.push('_None._');
  } else {
    let current = '';
    for (const f of b.findings) {
      if (f.severity !== current) {
        current = f.severity;
        L.push('');
        L.push(`### ${current.toUpperCase()}`);
        L.push('');
      }
      L.push(`- **[${f.timestamp}]** ${f.issue}`);
      L.push(`  - **fix:** ${f.fix || '(none given)'}`);
      L.push(`  - _${CLASS_LABEL[f.fixClass ?? 'advisory']} · raised by: ${f.lens || 'unknown'}_`);
    }
  }
  L.push('');

  L.push('## Fix queue (auto-fixable, $0)');
  L.push('');
  if (!b.fixQueue.length) L.push('_Nothing the assembly path can fix on its own._');
  else {
    L.push('The render/assembly path can consume these without spending anything (also in `fix_queue.json` and the `fix_queue` table):');
    L.push('');
    for (const f of b.fixQueue) L.push(`- [${f.timestamp}] ${f.issue} → ${f.fix}`);
  }
  L.push('');

  L.push('## Owner decision');
  L.push('');
  L.push('```');
  L.push(`npm run approvals                       # see everything waiting`);
  L.push(`npm run approve ${a.slug}`);
  L.push(`npm run reject  ${a.slug} "why it is wrong"`);
  L.push('```');
  L.push('');
  L.push('A rejection is filed as a lesson so the same mistake cannot come back.');
  L.push('');
  L.push(`_Generated ${b.createdAt} · run ${b.runId}_`);
  return L.join('\n');
}

export function writeReview(a: ReelArtifacts, b: ReviewBundle): void {
  writeFileSync(resolve(a.dir, 'REVIEW.md'), renderReviewMd(a, b));
  writeFileSync(resolve(a.dir, 'review.json'), JSON.stringify(b, null, 2));
  writeFileSync(
    resolve(a.dir, 'fix_queue.json'),
    JSON.stringify({ slug: a.slug, runId: b.runId, createdAt: b.createdAt, fixes: b.fixQueue }, null, 2),
  );
}
