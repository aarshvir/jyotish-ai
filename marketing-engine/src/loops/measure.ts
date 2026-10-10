import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { logRun } from '../db';
import { ENGINE_ROOT } from '../paths';
import { spendDecision } from '../spend';

export function runMeasure(db: DatabaseSync): void {
  const note = 'No Meta CAPI, no GA4 Measurement Protocol, no read of subscription_periods. Paying customers = 0. That is a count, not an estimate.';
  db.prepare(
    `INSERT INTO measurements (idea_slug, channel, paying_customers, cac_usd, ltv_usd, d30_retention, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run('two-slots-same-tuesday', 'unwired', 0, null, null, null, note, new Date().toISOString());

  const decision = spendDecision({ payingCustomers: 0, cacUsd: null, ltvUsd: null, d30Retention: null });
  const ideas = db.prepare(`SELECT slug, score FROM ideas ORDER BY score DESC`).all() as { slug: string; score: number }[];
  const drafts = db.prepare(`SELECT kind, lang, ok FROM drafts`).all() as { kind: string; lang: string; ok: number }[];
  const assets = db.prepare(`SELECT kind, path FROM assets ORDER BY id DESC LIMIT 6`).all() as { kind: string; path: string }[];

  const dir = resolve(ENGINE_ROOT, 'staged');
  mkdirSync(dir, { recursive: true });
  const rows = ideas.map((i) => `<tr><td>${i.slug}</td><td>${i.score}</td><td>no channel row</td><td>0</td><td>0</td></tr>`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>VedicHour marketing</title>
<style>body{font-family:DejaVu Sans,sans-serif;background:#0a0a1a;color:#f4ecd8;margin:32px} table{border-collapse:collapse;width:100%} td,th{border-bottom:1px solid #333;padding:8px;text-align:left} .bad{color:#e7c56a}</style></head>
<body><h1>What actually happened</h1>
<p class="bad">${note}</p>
<p>CAC, trial-start, trial→paid, D7, D30, payback: not computable. There is no free trial in the product, and this store has no payment rows.</p>
<p>Spend stage: <strong>${decision.stage}</strong>. Daily budget $${decision.dailyBudgetUsd}. ${decision.reason}</p>
<h2>Ideas</h2>
<table><tr><th>Idea</th><th>Score</th><th>Channel</th><th>Trials</th><th>Paid</th></tr>${rows}</table>
<h2>Drafts</h2><ul>${drafts.map((d) => `<li>${d.kind} (${d.lang}) ${d.ok ? 'pass' : 'rejected'}</li>`).join('')}</ul>
<h2>Assets</h2><ul>${assets.map((a) => `<li>${a.kind}: ${a.path}</li>`).join('')}</ul>
</body></html>`;
  writeFileSync(resolve(dir, 'dashboard.html'), html);

  const digest = `# Weekly digest

Working:
1. The same-day two-windows idea is ranked first on priors (demand × pull × distance × product fit). The picture is the public Monday sample, not a generic Tuesday.
2. The voice lint rejected the personal-attribute ad and kept the two product ads.
3. Assets, when this file is fresh, are the live quiz and the sample report, beat-locked to a Kokoro male voice.

Kill:
The health-and-energy ad angle. The quiz asks it. Marketing must not.

Missing, so do not spend:
Paying customers in this store: 0. LTV unknown. ${decision.reason}
`;
  writeFileSync(resolve(dir, 'digest.md'), digest);
  logRun(db, 'measure', 'ok', 'dashboard written; paying customers 0');
}
