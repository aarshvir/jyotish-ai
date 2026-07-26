/**
 * THE LIVING PLAYBOOK — craft research as editable, versioned DATA instead of a prompt string.
 *
 * The problem this fixes: the creative prompts were carrying hard-coded assertions about how
 * short-form video works ("Meta scores early retention at the 1-second mark", "bias short", …).
 * Those are RESEARCH. Research goes stale, platforms change their ranking, and our own results
 * will eventually contradict some of it — but frozen inside a template literal, none of it could
 * be revised by anyone except a developer editing TypeScript.
 *
 * So the principles live in config/playbook.json, each with a `source` and a `verifiedOn`, and the
 * prompts read them at runtime.
 *
 * `npm run playbook:review` asks brain() to re-examine every entry against what the engine has
 * ACTUALLY observed (performance aggregates + trend sensing) and writes PROPOSALS to
 * state/playbook-proposals.json plus the approval queue. It never edits config/playbook.json.
 * That asymmetry is the whole safety property: a hallucinated "best practice" written straight
 * into the playbook would be injected into every future reel forever, silently, with a
 * plausible-looking source line. A proposal the owner has to accept cannot do that.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { brain } from './brain/index';
import { db, enqueueApproval, logRun, ROOT } from './db/index';
import { aggregatePerformance, renderBrief } from './performance';
import { senseDigest } from './loops/sense';

const PLAYBOOK_FILE = resolve(ROOT, 'config', 'playbook.json');
const STATE_DIR = resolve(ROOT, 'state');
const PROPOSALS_FILE = resolve(STATE_DIR, 'playbook-proposals.json');

export type PlaybookCategory = 'hook' | 'retention' | 'format' | 'platform';
export type PlaybookConfidence = 'verified' | 'inherited' | 'contested';

export interface PlaybookEntry {
  id: string;
  category: string;
  principle: string;
  detail: string;
  source: string;
  verifiedOn: string;
  confidence: string;
}

export interface Playbook {
  version: string;
  updatedOn: string;
  entries: PlaybookEntry[];
}

const EMPTY: Playbook = { version: '0.0.0', updatedOn: 'never', entries: [] };

/** Read the playbook. Never throws — a malformed file must not take the creative loop down. */
export function loadPlaybook(): Playbook {
  try {
    const j = JSON.parse(readFileSync(PLAYBOOK_FILE, 'utf8'));
    const entries = (Array.isArray(j?.entries) ? j.entries : [])
      .map((e: any) => ({
        id: String(e?.id ?? '').trim(),
        category: String(e?.category ?? 'format').trim(),
        principle: String(e?.principle ?? '').trim(),
        detail: String(e?.detail ?? '').trim(),
        source: String(e?.source ?? 'unsourced').trim(),
        verifiedOn: String(e?.verifiedOn ?? 'unknown').trim(),
        confidence: String(e?.confidence ?? 'inherited').trim(),
      }))
      .filter((e: PlaybookEntry) => e.id && e.principle);
    return { version: String(j?.version ?? '0.0.0'), updatedOn: String(j?.updatedOn ?? 'unknown'), entries };
  } catch (e: any) {
    console.warn(`[playbook] config/playbook.json unreadable (${String(e?.message ?? e).slice(0, 80)}) — prompts run without it.`);
    return EMPTY;
  }
}

/**
 * Render the playbook as a prompt block. Returns '' when there is nothing, so callers can
 * interpolate unconditionally. The `verifiedOn` date and `confidence` travel WITH each line: a
 * writer that can see a principle is contested and untested treats it differently from a law.
 */
export function playbookBlock(categories?: PlaybookCategory[] | string[], heading = 'THE PLAYBOOK — craft principles, each with where it came from and when it was last checked'): string {
  const pb = loadPlaybook();
  const rows = categories?.length ? pb.entries.filter((e) => (categories as string[]).includes(e.category)) : pb.entries;
  if (!rows.length) return '';
  const body = rows
    .map(
      (e) =>
        `- [${e.category}${e.confidence === 'verified' ? '' : ` · ${e.confidence.toUpperCase()}`}] ${e.principle}\n` +
        `    ${e.detail}\n` +
        `    (source: ${e.source} · last checked ${e.verifiedOn})`,
    )
    .join('\n');
  return `${heading} (playbook v${pb.version}, updated ${pb.updatedOn}):\n${body}\n`;
}

// ---------------------------------------------------------------- review

export interface PlaybookProposal {
  entryId: string;
  action: 'keep' | 'revise' | 'retire' | 'add';
  proposedPrinciple: string;
  proposedDetail: string;
  rationale: string;
  evidence: string;
  confidence: string;
}

function reviewPrompt(pb: Playbook, perf: string, sense: string): string {
  return `You are auditing the craft playbook of a short-form video engine for VedicHour (an Indian Vedic-astrology
timing product). The playbook is what every future ad script is written from, so a wrong entry is not a
typo — it silently degrades every reel the engine will ever make.

THE PLAYBOOK AS IT STANDS (v${pb.version}, updated ${pb.updatedOn}):
${pb.entries
  .map(
    (e, i) =>
      `${i + 1}. id=${e.id} · category=${e.category} · confidence=${e.confidence} · last checked ${e.verifiedOn}
   principle: ${e.principle}
   detail: ${e.detail}
   source: ${e.source}`,
  )
  .join('\n')}

WHAT THE ENGINE HAS ACTUALLY OBSERVED:
${perf}

${sense || 'No trend-sensing data available this run.'}

YOUR TASK — for EACH entry, decide one of:
- "keep": the evidence does not contradict it and it is still worth stating.
- "revise": something we observed, or a change in how the platforms behave, means the wording should change.
- "retire": it is now wrong, or it is redundant with another entry.
You may ALSO propose at most 2 "add" entries, but ONLY for something the observed evidence above
actually supports.

THE RULES THAT MATTER MOST:
- You are NOT allowed to invent evidence. If the observed data is thin or absent, the honest answer for
  almost every entry is "keep", and your rationale must say the evidence is insufficient.
- Never propose a change justified only by what you believe about social platforms in general. That is
  how a confident hallucination becomes a permanent instruction. If you cannot point at a line in the
  observed evidence above, say so plainly in "evidence" — write "no evidence in this run".
- Never propose anything that would weaken a safety, brand or honesty constraint.
- A proposal that contradicts an owner ruling is out of scope; those live in the lessons store, not here.

Return STRICT JSON ONLY, no markdown fences, exactly this shape:
{"proposals":[{"entryId":"<existing id, or a new kebab-case id for an add>","action":"keep|revise|retire|add","proposedPrinciple":"<one sentence; repeat the current one unchanged for keep>","proposedDetail":"<the detail text you propose; repeat unchanged for keep>","rationale":"<max 30 words>","evidence":"<the exact observed line you are relying on, or 'no evidence in this run'>","confidence":"verified|inherited|contested"}]}`;
}

function extractJson(raw: string): any | null {
  const s = (raw ?? '').replace(/```[a-zA-Z]*/g, '').replace(/```/g, '').trim();
  const m = /\{[\s\S]*\}/.exec(s);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    try {
      return JSON.parse(m[0].replace(/,\s*([}\]])/g, '$1'));
    } catch {
      return null;
    }
  }
}

/**
 * `npm run playbook:review` — re-examine every principle against observed reality and file
 * PROPOSALS. Writes nothing to config/playbook.json, by design.
 */
export async function reviewPlaybook(): Promise<PlaybookProposal[]> {
  const loop = 'playbook:review';
  logRun({ loop, status: 'started' });
  const t0 = Date.now();

  const pb = loadPlaybook();
  if (!pb.entries.length) {
    console.log('[playbook] nothing to review — config/playbook.json is empty or unreadable.');
    logRun({ loop, status: 'skipped', detail: 'empty playbook' });
    return [];
  }

  const snap = await aggregatePerformance();
  const perf = renderBrief(snap);
  const sense = senseDigest(8, 8);

  let raw: string;
  try {
    const res = await brain(reviewPrompt(pb, perf, sense), { tier: 'smart', loop });
    raw = res.text;
    console.log(`[playbook] reviewed via ${res.cli} in ${res.durationMs}ms`);
  } catch (e: any) {
    const msg = String(e?.message ?? e).slice(0, 160);
    console.error(`[playbook] brain unavailable — no proposals this run (${msg})`);
    logRun({ loop, status: 'error', detail: msg });
    return [];
  }

  const parsed = extractJson(raw);
  const proposals: PlaybookProposal[] = (Array.isArray(parsed?.proposals) ? parsed.proposals : [])
    .map((p: any) => ({
      entryId: String(p?.entryId ?? '').trim(),
      action: (['keep', 'revise', 'retire', 'add'].includes(String(p?.action)) ? String(p.action) : 'keep') as PlaybookProposal['action'],
      proposedPrinciple: String(p?.proposedPrinciple ?? '').trim(),
      proposedDetail: String(p?.proposedDetail ?? '').trim(),
      rationale: String(p?.rationale ?? '').trim().slice(0, 240),
      evidence: String(p?.evidence ?? '').trim().slice(0, 400),
      confidence: String(p?.confidence ?? 'inherited').trim(),
    }))
    .filter((p: PlaybookProposal) => p.entryId);

  const changes = proposals.filter((p) => p.action !== 'keep');

  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(
    PROPOSALS_FILE,
    JSON.stringify(
      {
        reviewedAt: new Date().toISOString(),
        playbookVersion: pb.version,
        evidenceUsed: { performance: perf, senseAvailable: Boolean(sense) },
        proposals,
      },
      null,
      2,
    ),
  );

  // Queue only the CHANGES for the owner — "keep" is the null decision and does not need a human.
  for (const p of changes) {
    enqueueApproval({
      item: `Playbook ${p.action.toUpperCase()} "${p.entryId}": ${p.proposedPrinciple || '(retire)'} — ${p.rationale} [evidence: ${p.evidence}]`,
      lane: 'C',
      linter_verdict: null,
      linter_reason: null,
      channel: 'playbook',
    });
  }

  console.log(`\n[playbook] ${proposals.length} verdict(s): ${changes.length} proposed change(s), ${proposals.length - changes.length} keep.`);
  for (const p of changes) {
    console.log(`  ${p.action.toUpperCase().padEnd(7)} ${p.entryId}`);
    console.log(`          why      : ${p.rationale}`);
    console.log(`          evidence : ${p.evidence}`);
    if (p.proposedPrinciple) console.log(`          proposed : ${p.proposedPrinciple}`);
  }
  console.log(`\n[playbook] proposals written to ${PROPOSALS_FILE}`);
  console.log('[playbook] config/playbook.json was NOT modified — apply a proposal by editing it yourself.');
  if (changes.length) console.log('[playbook] queued in the approval queue (lane C, channel "playbook").\n');

  logRun({ loop, status: 'ok', detail: `${changes.length} proposed change(s) of ${proposals.length}`, duration_ms: Date.now() - t0 });
  return proposals;
}

/** `npm run playbook` — print what the prompts are currently being told. */
export function printPlaybook(): void {
  const pb = loadPlaybook();
  console.log(`\nPlaybook v${pb.version} (updated ${pb.updatedOn}) — ${pb.entries.length} principle(s) injected into the creative prompts\n`);
  for (const e of pb.entries) {
    console.log(`  ${e.id}  [${e.category}] [${e.confidence}]  last checked ${e.verifiedOn}`);
    console.log(`      ${e.principle}`);
    console.log(`      source: ${e.source}`);
    console.log('');
  }
  const pending = db()
    .prepare(`SELECT COUNT(*) n FROM approval_queue WHERE channel='playbook' AND status='pending'`)
    .get() as { n: number };
  if (pending.n) console.log(`  ${pending.n} playbook proposal(s) awaiting your decision — npm run approvals\n`);
}

// `npm run playbook` / `npm run playbook:review`. Own entry point so the shared src/cli.ts stays
// out of the way of the concurrent session that also edits it (CLAUDE.md §8).
if (process.argv[1] && /playbook\.[cm]?ts$/.test(process.argv[1].replace(/\\/g, '/'))) {
  const cmd = process.argv[2];
  const run = cmd === 'review' ? reviewPlaybook() : Promise.resolve(printPlaybook());
  Promise.resolve(run).catch((e) => {
    console.error(e?.stack ?? e);
    process.exit(1);
  });
}
