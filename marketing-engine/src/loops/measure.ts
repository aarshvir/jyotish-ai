import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { db, logRun } from '../db';
import { OUT_DIR } from '../paths';
import { envStr } from '../env';
import { firstPartyCategories } from '../sources/firstparty';

export async function runMeasure(): Promise<{ notes: string[] }> {
  const t0 = Date.now();
  const fp = await firstPartyCategories();
  db().prepare(
    `INSERT INTO funnel_snapshots (paying_customers, trials, ltv_estimate, cac_ceiling, payload_json)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(
    fp.paying,
    fp.trials,
    fp.ltvMean,
    fp.ltvMean ? fp.ltvMean * 0.3 : null,
    JSON.stringify({
      categories: fp.categories,
      error: fp.error ?? null,
      note: 'CAC is unknown until paid ads run with UTMs. Organic until then.',
    }),
  );

  const ideas = db()
    .prepare(
      `SELECT i.slug, i.score, i.status, i.category,
              (SELECT COUNT(*) FROM assets a WHERE a.idea_id=i.id) assets,
              (SELECT COUNT(*) FROM packages p WHERE p.idea_id=i.id) packages
       FROM ideas i ORDER BY i.score DESC LIMIT 12`,
    )
    .all() as { slug: string; score: number; status: string; category: string; assets: number; packages: number }[];

  const digest = [
    `# Weekly digest — ${new Date().toISOString().slice(0, 10)}`,
    '',
    '## Three things working',
    ideas.length ? `1. Top idea: **${ideas[0].slug}** (score ${ideas[0].score.toFixed(2)}, ${ideas[0].status})` : '1. No ideas yet.',
    '2. First-party questions are classified into categories only — no verbatim storage.',
    '3. Paid spend is gated until real paying customers exist.',
    '',
    '## One thing to kill',
    fp.paying < 5
      ? `- Do not buy ads. Paying customers=${fp.paying}. Organic conversion is the bottleneck.`
      : '- Kill any creative that picked up a policy flag this week (see approvals table).',
    '',
    '## Funnel (actual, not assumed)',
    `- Paying (ziina completed): ${fp.paying}`,
    `- Trials/reports with a payment status: ${fp.trials}`,
    `- LTV estimate (mean completed payment): ${fp.ltvMean ?? 'unknown'}`,
    `- CAC: unknown until UTMs on ads`,
    `- D7/D30 retention: unknown until subscription rows exist (product is pivoting; do not fake a D30)`,
    fp.error ? `- First-party note: ${fp.error}` : '',
    '',
    'CAPI/GA4: collector not sending yet (keys optional). When live, payloads exclude birth data.',
  ]
    .filter(Boolean)
    .join('\n');

  mkdirSync(resolve(OUT_DIR, 'reports'), { recursive: true });
  const digestPath = resolve(OUT_DIR, 'reports', `digest-${new Date().toISOString().slice(0, 10)}.md`);
  writeFileSync(digestPath, digest);
  writeFileSync(resolve(OUT_DIR, 'reports', 'digest-latest.md'), digest);

  const notes = [`digest ${digestPath}`, envStr('GA4_MEASUREMENT_ID') ? 'GA4 id present (not firing in this run)' : 'GA4 unset'];
  logRun('measure', 'ok', notes.join(' · '), Date.now() - t0);
  return { notes };
}
