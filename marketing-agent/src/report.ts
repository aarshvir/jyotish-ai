import { readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { db, ROOT } from './db/index';
import { isKilled, killInfo } from './safety/killswitch';
import { readHeartbeat } from './scheduler/heartbeat';

function dirCount(rel: string, filter: (f: string) => boolean): number {
  const p = resolve(ROOT, rel);
  if (!existsSync(p)) return 0;
  return readdirSync(p).filter(filter).length;
}

/** One-shot content-bank inventory + ship checklist. No CLI/brain calls. */
export function report(): void {
  const d = db();
  console.log('\n=== VedicHour Marketing Agent — content bank report ===\n');

  console.log('Content library (SQLite, by type/status):');
  const rows = d.prepare(`SELECT type, status, COUNT(*) n FROM content_library GROUP BY type, status ORDER BY type, status`).all();
  if ((rows as any[]).length) console.table(rows);
  else console.log('  (empty)');

  console.log('Staged on disk:');
  console.log('  blog drafts        output/blog/*.ts        :', dirCount('output/blog', (f) => f.endsWith('.ts')));
  console.log('  reels rendered     media/reels/*/*.mp4     :', dirCount('media/reels', (s) => existsSync(resolve(ROOT, 'media/reels', s, `${s}.mp4`))));
  console.log('  reels packaged     media/reels/*/publish.json:', dirCount('media/reels', (s) => existsSync(resolve(ROOT, 'media/reels', s, 'publish.json'))));
  console.log('  social posts       output/social/*.json    :', dirCount('output/social', (f) => f.endsWith('.json') && f !== 'social-bank.json'));
  console.log('  lifecycle steps    output/lifecycle/*.json :', dirCount('output/lifecycle', (f) => f.endsWith('.json')));
  console.log('  outreach drafts    output/outreach/*.json  :', dirCount('output/outreach', (f) => f.endsWith('.json')));

  const pending = (d.prepare(`SELECT COUNT(*) n FROM approval_queue WHERE status='pending'`).get() as { n: number }).n;
  const runs = (d.prepare(`SELECT COUNT(*) n FROM runs_log`).get() as { n: number }).n;
  const errs = (d.prepare(`SELECT COUNT(*) n FROM runs_log WHERE status='error'`).get() as { n: number }).n;
  const consents = (d.prepare(`SELECT COUNT(*) n FROM consent_log`).get() as { n: number }).n;

  console.log('\nOps:');
  console.log('  pending approvals  :', pending);
  console.log('  consent contacts   :', consents);
  console.log('  total runs / errors:', runs, '/', errs);
  console.log('  kill-switch        :', isKilled() ? `ENGAGED (${killInfo()?.reason})` : 'off');
  const hb = readHeartbeat();
  console.log('  last heartbeat     :', hb._last ? `${hb._last.loop} @ ${hb._last.at}` : 'none');

  console.log('\nReady-to-ship (linter PASS / ready_to_post):');
  const readyBlogs = d.prepare(`SELECT DISTINCT json_extract(meta,'$.slug') slug FROM content_library WHERE type='blog' AND status='ready'`).all() as { slug: string }[];
  console.log('  blog posts (npm run blog:promote <slug>):', readyBlogs.map((r) => r.slug).filter(Boolean).join(', ') || '—');
  console.log('\nNothing is posted or sent — publishing is the OAuth/Brevo/WhatsApp-gated step.\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  report();
}
