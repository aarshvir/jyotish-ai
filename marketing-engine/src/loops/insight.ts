import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { db, logRun } from '../db';
import { CONFIG_DIR } from '../paths';
import { fetchTrendsIN, type ExternalSignal } from '../sources/trends';
import { fetchWikipedia } from '../sources/wikipedia';
import { fetchItunes } from '../sources/itunes';
import { fetchYoutube } from '../sources/youtube';
import { firstPartyCategories } from '../sources/firstparty';
import { envOn } from '../env';

interface Seed {
  slug: string;
  title: string;
  query: string;
  category: string;
  search: number;
  emotion: number;
  uniqueness: number;
  product_fit: number;
  angle: string;
}

function overlap(a: string, b: string): boolean {
  const wa = new Set(a.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  const wb = b.toLowerCase();
  let n = 0;
  for (const w of wa) if (wb.includes(w)) n++;
  return n >= 2;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export async function runInsight(): Promise<{ ideas: number; notes: string[] }> {
  const t0 = Date.now();
  const notes: string[] = [];
  const seeds = (JSON.parse(readFileSync(resolve(CONFIG_DIR, 'demand-seeds.json'), 'utf8')) as { seeds: Seed[] }).seeds;

  if (envOn('REDDIT_COMMERCIAL_LICENSE')) {
    notes.push('Reddit license flag is on but OAuth harvest is not implemented in v1 — skipped rather than scrape.');
  } else {
    notes.push('Reddit skipped: commercial use needs a written Reddit contract (Data API Terms).');
  }
  notes.push('Google autocomplete / PAA skipped: no official API; scraping google.com is a ToS violation.');

  const [trends, wiki, itunes, yt, fp] = await Promise.all([
    fetchTrendsIN(),
    fetchWikipedia(),
    fetchItunes(),
    fetchYoutube(),
    firstPartyCategories(),
  ]);

  const live: ExternalSignal[] = [...trends.signals, ...wiki.signals, ...itunes.signals, ...yt.signals];
  if (trends.error) notes.push(`trends: ${trends.error}`);
  if (wiki.error) notes.push(`wikipedia: ${wiki.error}`);
  if (itunes.error) notes.push(`itunes: ${itunes.error}`);
  if (yt.error) notes.push(`youtube: ${yt.error}`);
  if (fp.error) notes.push(`first-party: ${fp.error}`);
  else notes.push(`first-party: ${fp.categories.map((c) => `${c.category}:${c.n}`).join(', ') || 'no questions'} (raw text discarded, hashes=${fp.discardedHashes})`);

  const fpTotal = fp.categories.reduce((a, c) => a + c.n, 0);
  const fpShare = (cat: string) => {
    if (!fpTotal) return 0;
    const row = fp.categories.find((c) => c.category === cat);
    return (row?.n ?? 0) / fpTotal;
  };

  const d = db();
  const upsert = d.prepare(
    `INSERT INTO ideas (slug, title, angle, category, sources_json, search_demand, emotional_pull, uniqueness, product_fit, score, rationale, weight, updated_at)
     VALUES (@slug, @title, @angle, @category, @sources_json, @search_demand, @emotional_pull, @uniqueness, @product_fit, @score, @rationale, COALESCE((SELECT weight FROM ideas WHERE slug=@slug), 1), datetime('now'))
     ON CONFLICT(slug) DO UPDATE SET
       title=excluded.title,
       angle=excluded.angle,
       search_demand=excluded.search_demand,
       emotional_pull=excluded.emotional_pull,
       uniqueness=excluded.uniqueness,
       product_fit=excluded.product_fit,
       score=excluded.score,
       rationale=excluded.rationale,
       sources_json=excluded.sources_json,
       updated_at=datetime('now')`,
  );

  const tx = d.transaction(() => {
    for (const s of seeds) {
      const hits = live.filter((x) => overlap(s.title + ' ' + s.query + ' ' + s.angle, x.term + ' ' + x.detail));
      const liveBoost = hits.length ? Math.min(0.25, hits.reduce((a, h) => a + h.heat, 0) / 8) : 0;
      const complaintHit = live.some((x) => x.source === 'itunes_review' && overlap(s.angle, x.term));
      const search = clamp01(s.search + liveBoost + fpShare(s.category) * 0.2);
      const emotion = clamp01(s.emotion);
      const uniqueness = clamp01(s.uniqueness - (complaintHit ? 0.08 : 0) + (s.product_fit > 0.9 ? 0.05 : 0));
      const product_fit = clamp01(s.product_fit + fpShare(s.category) * 0.1);
      const existing = d.prepare(`SELECT weight FROM ideas WHERE slug=?`).get(s.slug) as { weight: number } | undefined;
      const weight = existing?.weight ?? 1;
      const score = weight * (0.3 * search + 0.25 * emotion + 0.2 * uniqueness + 0.25 * product_fit);
      const rationale = [
        `search=${search.toFixed(2)} (seed ${s.search.toFixed(2)} + live ${liveBoost.toFixed(2)} + first-party share ${fpShare(s.category).toFixed(2)}; not a fabricated volume)`,
        `emotion=${emotion.toFixed(2)}`,
        `uniqueness=${uniqueness.toFixed(2)}${complaintHit ? ' (trimmed: competitors already hear this complaint)' : ''}`,
        `product_fit=${product_fit.toFixed(2)}`,
        `weight=${weight.toFixed(2)}`,
        hits.length ? `live overlaps: ${hits.slice(0, 3).map((h) => h.source + ':' + h.term).join('; ')}` : 'no live overlap today',
      ].join(' | ');
      upsert.run({
        slug: s.slug,
        title: s.title,
        angle: s.angle,
        category: s.category,
        sources_json: JSON.stringify([{ source: 'seed', term: s.query }, ...hits.slice(0, 6)]),
        search_demand: search,
        emotional_pull: emotion,
        uniqueness,
        product_fit,
        score,
        rationale,
      });
    }
  });
  tx();

  if (fp.paying || fp.trials) {
    d.prepare(
      `INSERT INTO funnel_snapshots (paying_customers, trials, ltv_estimate, cac_ceiling, payload_json)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(fp.paying, fp.trials, fp.ltvMean, fp.ltvMean ? fp.ltvMean * 0.3 : null, JSON.stringify({ categories: fp.categories }));
  }

  const n = (d.prepare(`SELECT COUNT(*) n FROM ideas`).get() as { n: number }).n;
  logRun('insight', 'ok', notes.join(' · '), Date.now() - t0);
  return { ideas: n, notes };
}
