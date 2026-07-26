import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { logRun } from '../db/index';
import { auditDb } from './store';
import { addLessonSafe, toLessonScope, toLessonSeverity } from './lessons-bridge';
import { reelDir } from './artifacts';

/**
 * STAGE 4 — THE OWNER APPROVAL GATE.
 *
 * Project law §5: nothing reaches a platform without an explicit owner decision. Any publish
 * path MUST call canPublish(slug) and refuse when it is false. There is no auto-approve, no
 * timeout that approves, and no verdict good enough to skip this.
 */

export interface ApprovalRow {
  id: number;
  slug: string;
  verdict: string;
  review_path: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'superseded';
  owner_note: string | null;
  created_at: string;
  decided_at: string | null;
}

/** Queue a reel for the owner. Any earlier pending row for the same slug is superseded. */
export function queueApproval(slug: string, verdict: string, reviewPath: string): number {
  const d = auditDb();
  const tx = d.transaction(() => {
    d.prepare(`UPDATE publish_approvals SET status='superseded', decided_at=datetime('now') WHERE slug=? AND status='pending'`).run(slug);
    return d
      .prepare(`INSERT INTO publish_approvals (slug, verdict, review_path, status) VALUES (?,?,?,'pending')`)
      .run(slug, verdict, reviewPath).lastInsertRowid;
  });
  return Number(tx());
}

export function pendingApprovals(): ApprovalRow[] {
  return auditDb()
    .prepare(`SELECT * FROM publish_approvals WHERE status='pending' ORDER BY created_at DESC, id DESC`)
    .all() as ApprovalRow[];
}

export function latestFor(slug: string): ApprovalRow | null {
  return (auditDb()
    .prepare(`SELECT * FROM publish_approvals WHERE slug=? ORDER BY id DESC LIMIT 1`)
    .get(slug) as ApprovalRow) ?? null;
}

/**
 * The ONLY question a publish path may ask. True iff the newest decision for this slug is
 * an explicit owner approval.
 */
export function canPublish(slug: string): boolean {
  return latestFor(slug)?.status === 'approved';
}

function decide(slug: string, status: 'approved' | 'rejected', note: string): ApprovalRow | null {
  const row = auditDb()
    .prepare(`SELECT * FROM publish_approvals WHERE slug=? AND status='pending' ORDER BY id DESC LIMIT 1`)
    .get(slug) as ApprovalRow | undefined;
  if (!row) return null;
  auditDb()
    .prepare(`UPDATE publish_approvals SET status=?, owner_note=?, decided_at=datetime('now') WHERE id=?`)
    .run(status, note || null, row.id);
  return { ...row, status, owner_note: note || null, decided_at: new Date().toISOString() };
}

export function approve(slug: string, note = ''): ApprovalRow | null {
  const r = decide(slug, 'approved', note);
  if (r) logRun({ loop: 'approvals', status: 'ok', detail: `APPROVED ${slug}${note ? ` — ${note}` : ''}` });
  return r;
}

/**
 * Reject. LAW §4: the reason becomes a lesson in the same turn — the owner must never have to
 * say the same thing twice.
 */
export async function reject(slug: string, reason: string): Promise<{ row: ApprovalRow | null; lesson: string }> {
  const r = decide(slug, 'rejected', reason);
  const stored = await addLessonSafe({
    source: 'owner',
    severity: 'critical',
    scope: toLessonScope(reason),
    rule: reason,
    evidence: `Owner rejected reel ${slug} on ${new Date().toISOString().slice(0, 10)}. Review: ${r?.review_path ?? resolve(reelDir(slug), 'REVIEW.md')}`,
  });
  if (r) logRun({ loop: 'approvals', status: 'ok', detail: `REJECTED ${slug} — ${reason}` });
  return { row: r, lesson: stored };
}

/**
 * Blocker findings become lessons too (LAW §4).
 *
 * Deliberately narrow: active lessons are injected into every future creative prompt and
 * asserted in every pre-flight, so a review that files fifty of them poisons the well — the
 * owner's five rulings would drown in a model's stylistic notes. Only blockers, only the
 * worst few, and only ones that carry an actionable fix.
 */
const MAX_LESSONS_PER_REVIEW = 8;

export async function fileFindingLessons(
  slug: string,
  findings: { severity: string; issue: string; fix: string; timestamp: string; lens?: string; stage?: string }[],
): Promise<number> {
  let n = 0;
  const worth = findings
    .filter((x) => x.severity === 'blocker' && (x.fix || x.issue).trim().length > 20)
    .slice(0, MAX_LESSONS_PER_REVIEW);
  for (const f of worth) {
    await addLessonSafe({
      source: f.stage === 'gpt' ? 'gpt_review' : 'internal_audit',
      severity: toLessonSeverity(f.severity),
      scope: toLessonScope(`${f.issue} ${f.fix}`),
      rule: f.fix || f.issue,
      evidence: `${slug} @ ${f.timestamp} (${f.lens ?? 'review'}): ${f.issue}`,
    });
    n++;
  }
  return n;
}

/** `npm run approvals` */
export function printPending(): void {
  const rows = pendingApprovals();
  if (!rows.length) {
    console.log('\nNothing is waiting for you. (Run `npm run loop:review -- <slug>` to review a rendered reel.)\n');
    return;
  }
  console.log(`\n${rows.length} reel(s) waiting for your decision:\n`);
  for (const r of rows) {
    console.log(`  ${r.slug}`);
    console.log(`     gate verdict : ${r.verdict}`);
    console.log(`     reviewed     : ${r.created_at}`);
    console.log(`     read         : ${r.review_path ?? '(none)'}`);
    const vid = resolve(reelDir(r.slug), 'final.mp4');
    if (existsSync(vid)) console.log(`     watch        : ${vid}`);
    const summary = summarize(r.review_path);
    if (summary) console.log(`     summary      : ${summary}`);
    console.log(`     approve      : npm run approve ${r.slug}`);
    console.log(`     reject       : npm run reject ${r.slug} "reason"`);
    console.log('');
  }
}

function summarize(reviewPath: string | null): string {
  if (!reviewPath || !existsSync(reviewPath)) return '';
  try {
    const md = readFileSync(reviewPath, 'utf8');
    return /FINDINGS: (.*)/.exec(md)?.[1]?.trim() ?? '';
  } catch {
    return '';
  }
}
