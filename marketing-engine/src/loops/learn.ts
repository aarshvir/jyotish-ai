import { existsSync, writeFileSync, appendFileSync } from 'node:fs';
import { db, logRun } from '../db';
import { LEARNINGS_FILE } from '../paths';

export async function runLearn(): Promise<{ notes: string[] }> {
  const t0 = Date.now();
  const ideas = db().prepare(`SELECT id, slug, score, weight, status FROM ideas`).all() as {
    id: number;
    slug: string;
    score: number;
    weight: number;
    status: string;
  }[];

  const events = db()
    .prepare(`SELECT idea_id, event, COUNT(*) n FROM events GROUP BY idea_id, event`)
    .all() as { idea_id: number; event: string; n: number }[];

  const notes: string[] = [];
  if (!existsSync(LEARNINGS_FILE)) {
    writeFileSync(LEARNINGS_FILE, '# Learnings\n\nEvidence-backed only. No vibes.\n\n');
  }

  if (!events.length) {
    const line = `- ${new Date().toISOString().slice(0, 10)}: No attributed events yet. Weights unchanged. Do not boost a winner you have not measured.\n`;
    appendFileSync(LEARNINGS_FILE, line);
    db().prepare(`INSERT INTO learnings (finding, evidence, weight_delta) VALUES (?,?,?)`).run(
      'No events — freeze weights',
      'events table empty',
      0,
    );
    notes.push('weights frozen (no events)');
    logRun('learn', 'ok', notes[0], Date.now() - t0);
    return { notes };
  }

  for (const idea of ideas) {
    const paid = events.find((e) => e.idea_id === idea.id && e.event === 'paid')?.n ?? 0;
    const trial = events.find((e) => e.idea_id === idea.id && e.event === 'trial')?.n ?? 0;
    let delta = 0;
    if (paid >= 2) delta = 0.15;
    else if (trial >= 5 && paid === 0) delta = -0.1;
    if (!delta) continue;
    const next = Math.max(0.4, Math.min(2, idea.weight + delta));
    db().prepare(`UPDATE ideas SET weight=?, updated_at=datetime('now') WHERE id=?`).run(next, idea.id);
    db().prepare(`INSERT INTO learnings (idea_id, finding, evidence, weight_delta) VALUES (?,?,?,?)`).run(
      idea.id,
      delta > 0 ? 'boost winner' : 'decay non-converter',
      `${idea.slug} trials=${trial} paid=${paid}`,
      delta,
    );
    appendFileSync(
      LEARNINGS_FILE,
      `- ${new Date().toISOString().slice(0, 10)}: ${idea.slug} weight ${idea.weight.toFixed(2)} → ${next.toFixed(2)} (trials=${trial} paid=${paid})\n`,
    );
    notes.push(`${idea.slug} ${delta > 0 ? '+' : ''}${delta}`);
  }

  // Recompute scores with new weights using stored components.
  const rows = db()
    .prepare(`SELECT id, search_demand, emotional_pull, uniqueness, product_fit, weight FROM ideas`)
    .all() as { id: number; search_demand: number; emotional_pull: number; uniqueness: number; product_fit: number; weight: number }[];
  const upd = db().prepare(`UPDATE ideas SET score=?, updated_at=datetime('now') WHERE id=?`);
  const tx = db().transaction(() => {
    for (const r of rows) {
      const score = r.weight * (0.3 * r.search_demand + 0.25 * r.emotional_pull + 0.2 * r.uniqueness + 0.25 * r.product_fit);
      upd.run(score, r.id);
    }
  });
  tx();

  logRun('learn', 'ok', notes.join(' · ') || 'no weight moves', Date.now() - t0);
  return { notes };
}

