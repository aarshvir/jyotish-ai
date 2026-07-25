import { readdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { lint } from './policy/linter';
import { db, logRun, ROOT } from './db/index';

const SOCIAL = resolve(ROOT, 'output', 'social');
const BLOG = resolve(ROOT, 'output', 'blog');

/** Re-score pre-calibration social posts; resolve stale approval_queue entries that now pass. */
export async function relintSocial(): Promise<number> {
  if (!existsSync(SOCIAL)) return 0;
  const files = readdirSync(SOCIAL).filter((f) => f.endsWith('.json') && f !== 'social-bank.json');
  let flipped = 0;
  for (const f of files) {
    const path = resolve(SOCIAL, f);
    const entry = JSON.parse(readFileSync(path, 'utf8'));
    let anyFlag = false;
    for (const key of Object.keys(entry.platforms ?? {})) {
      const p = entry.platforms[key];
      const v = await lint(String(p.text ?? ''));
      p.linter = v.verdict;
      p.linter_reason = v.reason;
      if (v.verdict !== 'pass') anyFlag = true;
    }
    const was = entry.status;
    entry.status = anyFlag ? 'needs_review' : 'ready_to_post';
    writeFileSync(path, JSON.stringify(entry, null, 2));
    db().prepare(`UPDATE content_library SET status=?, updated_at=datetime('now') WHERE asset=?`).run(anyFlag ? 'flagged' : 'ready', path);
    if (!anyFlag && was !== 'ready_to_post') {
      db().prepare(`UPDATE approval_queue SET status='resolved', resolved_by='relint', resolved_at=datetime('now') WHERE channel='social' AND status='pending' AND item=?`).run(`Social: ${entry.topic}`);
      flipped++;
    }
    console.log(`[relint:social] ${entry.slug}: ${was} -> ${entry.status}`);
  }
  const bank = files.map((f) => JSON.parse(readFileSync(resolve(SOCIAL, f), 'utf8')));
  writeFileSync(resolve(SOCIAL, 'social-bank.json'), JSON.stringify(bank, null, 2));
  return flipped;
}

/** Re-score staged blog posts; recover ones the pre-calibration linter over-blocked. */
export async function relintBlog(): Promise<{ recovered: number; cleared: number }> {
  if (!existsSync(BLOG)) return { recovered: 0, cleared: 0 };
  const files = readdirSync(BLOG).filter((f) => f.endsWith('.ts'));
  let recovered = 0;
  let cleared = 0;
  for (const f of files) {
    const file = resolve(BLOG, f);
    const src = readFileSync(file, 'utf8');
    const m = /export const post: BlogPost = (\{[\s\S]*\});\s*$/.exec(src);
    if (!m) continue;
    let post: any;
    try {
      post = JSON.parse(m[1]);
    } catch {
      continue;
    }
    // never auto-flip a post that is already published live
    const cur = db().prepare(`SELECT status FROM content_library WHERE asset=? ORDER BY id DESC LIMIT 1`).get(file) as { status?: string } | undefined;
    if (cur?.status === 'published') {
      console.log(`[relint:blog] ${post.slug}: published (left as-is)`);
      continue;
    }
    const v = await lint(`${post.title}\n${post.description}\n${post.html}`);
    const newStatus = v.verdict === 'block' ? 'archived' : 'ready';
    const was = cur?.status ?? 'unknown';
    db().prepare(`UPDATE content_library SET status=?, updated_at=datetime('now') WHERE asset=?`).run(newStatus, file);
    if (was === 'archived' && newStatus === 'ready') recovered++;
    if (v.verdict === 'pass') {
      const r = db().prepare(`UPDATE approval_queue SET status='resolved', resolved_by='relint', resolved_at=datetime('now') WHERE channel='blog' AND status='pending' AND item=?`).run(`Blog: ${post.title}`);
      cleared += (r.changes as number) || 0;
    }
    console.log(`[relint:blog] ${post.slug}: ${was} -> ${newStatus} (${v.verdict})`);
  }
  return { recovered, cleared };
}

export async function runRelint(): Promise<void> {
  logRun({ loop: 'relint', status: 'started' });
  const blog = await relintBlog();
  const flippedSocial = await relintSocial();
  console.log(`\n[relint] blog: recovered ${blog.recovered} over-blocked posts, cleared ${blog.cleared} from queue. social: ${flippedSocial} flipped to ready.`);
  logRun({ loop: 'relint', status: 'ok', detail: `blog +${blog.recovered}/-${blog.cleared}q, social +${flippedSocial}` });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runRelint().catch((e) => {
    console.error(e?.stack ?? e);
    process.exit(1);
  });
}
