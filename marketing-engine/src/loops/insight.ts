import type { DatabaseSync } from 'node:sqlite';
import { SEEDS } from '../../config/seeds';
import { logRun } from '../db';
import { rankIdeas } from '../score';

export function runInsight(db: DatabaseSync): { slug: string; score: number }[] {
  const ranked = rankIdeas(SEEDS);
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO ideas (slug, title, source, score, concern, ads_allowed, rationale, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET
      title = excluded.title,
      source = excluded.source,
      score = excluded.score,
      concern = excluded.concern,
      ads_allowed = excluded.ads_allowed,
      rationale = excluded.rationale,
      updated_at = excluded.updated_at
  `);
  for (const idea of ranked) {
    stmt.run(idea.slug, idea.title, idea.source, idea.score, idea.concern, idea.adsAllowed ? 1 : 0, idea.rationale, now);
  }
  logRun(
    db,
    'insight',
    'ok',
    `ranked ${ranked.length}. External Reddit/Quora/autocomplete skipped (no official API; scraping is out). No production quiz-answer aggregate is connected, so scores are priors.`,
  );
  return ranked.map((i) => ({ slug: i.slug, score: i.score }));
}
