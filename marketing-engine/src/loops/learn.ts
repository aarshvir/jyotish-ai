import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { ENGINE_ROOT } from '../paths';
import { logRun } from '../db';
import { applyLearning } from '../score';

const LEARNINGS = resolve(ENGINE_ROOT, 'learnings.md');

export function runLearn(db: DatabaseSync): void {
  const ideas = db.prepare(`SELECT slug, score FROM ideas`).all() as { slug: string; score: number }[];
  // No measured reach yet. applyLearning with an empty list is the honest path.
  const next = applyLearning(ideas, []);
  const header = existsSync(LEARNINGS) ? readFileSync(LEARNINGS, 'utf8') : '# Learnings\n\nEvidence the engine has actually seen. Priors are not evidence.\n';
  const block = `\n## ${new Date().toISOString().slice(0, 10)}\n\nNo channel has reported reach or paid starts into this SQLite store. Ranks stay on the priors from \`config/seeds.ts\`. Winning angles will gain weight only after a row with reached > 0 exists. Health and marriage stay off ads regardless of score.\n\n${next.map((n) => `- ${n.slug}: ${n.score} — ${n.note}`).join('\n')}\n`;
  if (!header.includes(block.trim().slice(0, 40))) {
    writeFileSync(LEARNINGS, header.trimEnd() + '\n' + block);
  }
  logRun(db, 'learn', 'ok', 'no measured outcomes; ranks unchanged');
}
