import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { db } from './db';
import { OUT_DIR } from './paths';
import { BRAND } from './brand';

export function writeDashboard(): string {
  mkdirSync(OUT_DIR, { recursive: true });
  const ideas = db()
    .prepare(`SELECT slug, title, category, score, status, rationale FROM ideas ORDER BY score DESC`)
    .all() as { slug: string; title: string; category: string; score: number; status: string; rationale: string }[];
  const runs = db()
    .prepare(`SELECT ts, loop, status, detail, duration_ms FROM runs ORDER BY id DESC LIMIT 20`)
    .all() as { ts: string; loop: string; status: string; detail: string | null; duration_ms: number | null }[];
  const snap = db()
    .prepare(`SELECT * FROM funnel_snapshots ORDER BY id DESC LIMIT 1`)
    .get() as { paying_customers: number; trials: number; ltv_estimate: number | null; ts: string } | undefined;
  const pkgs = db()
    .prepare(`SELECT channel, status, folder, why FROM packages ORDER BY id DESC LIMIT 8`)
    .all() as { channel: string; status: string; folder: string; why: string | null }[];
  const camp = db()
    .prepare(`SELECT spend_status, recommendation FROM campaigns ORDER BY id DESC LIMIT 1`)
    .get() as { spend_status: string; recommendation: string } | undefined;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>VedicHour marketing engine</title>
<style>
  body{margin:0;background:${BRAND.colors.paper0};color:${BRAND.colors.ink900};font-family:DM Sans,system-ui,sans-serif;}
  main{max-width:960px;margin:0 auto;padding:40px 20px 80px;}
  h1{font-family:Georgia,serif;font-size:2.2rem;margin:0 0 8px;}
  .sub{color:${BRAND.colors.ink500};margin:0 0 32px;}
  table{width:100%;border-collapse:collapse;background:#fff;margin:0 0 32px;}
  th,td{text-align:left;padding:10px 12px;border-bottom:1px solid #E6DBCB;vertical-align:top;font-size:14px;}
  th{color:${BRAND.colors.ink500};font-weight:500;}
  .pill{display:inline-block;padding:2px 8px;border-radius:999px;background:#F8EDD4;color:${BRAND.colors.amber600};font-size:12px;}
  .k{font-size:2rem;font-variant-numeric:tabular-nums;}
  .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:0 0 32px;}
  .card{background:#fff;padding:16px;border:1px solid #E6DBCB;}
  .muted{color:${BRAND.colors.ink500};font-size:12px;}
</style></head>
<body><main>
  <h1>VedicHour engine</h1>
  <p class="sub">Which idea → which asset → which channel → trials → paid. Spend stays a human click.</p>
  <div class="grid">
    <div class="card"><div class="muted">Paying</div><div class="k">${snap?.paying_customers ?? 0}</div></div>
    <div class="card"><div class="muted">Trials</div><div class="k">${snap?.trials ?? 0}</div></div>
    <div class="card"><div class="muted">LTV (mean payment)</div><div class="k">${snap?.ltv_estimate ?? '—'}</div></div>
    <div class="card"><div class="muted">Ads</div><div class="k">${camp?.spend_status ?? 'hold'}</div></div>
  </div>
  <p>${esc(camp?.recommendation ?? 'Run loop:paid after insight so a spend decision exists.')}</p>
  <h2>Backlog</h2>
  <table><thead><tr><th>Score</th><th>Idea</th><th>Status</th><th>Why</th></tr></thead><tbody>
  ${ideas.map((i) => `<tr><td>${i.score.toFixed(3)}</td><td><strong>${esc(i.title)}</strong><br><span class="pill">${esc(i.category)}</span></td><td>${esc(i.status)}</td><td class="muted">${esc(i.rationale)}</td></tr>`).join('')}
  </tbody></table>
  <h2>Needs your click</h2>
  <table><thead><tr><th>Channel</th><th>Status</th><th>Why</th></tr></thead><tbody>
  ${pkgs.map((p) => `<tr><td>${esc(p.channel)}</td><td>${esc(p.status)}</td><td class="muted">${esc(p.why ?? '')}<br>${esc(p.folder)}</td></tr>`).join('') || '<tr><td colspan="3">Nothing packaged yet.</td></tr>'}
  </tbody></table>
  <h2>Runs</h2>
  <table><thead><tr><th>When</th><th>Loop</th><th>Status</th><th>Detail</th></tr></thead><tbody>
  ${runs.map((r) => `<tr><td>${esc(r.ts)}</td><td>${esc(r.loop)}</td><td>${esc(r.status)}</td><td class="muted">${esc((r.detail ?? '').slice(0, 220))}${r.duration_ms != null ? ` (${r.duration_ms}ms)` : ''}</td></tr>`).join('')}
  </tbody></table>
</main></body></html>`;

  const path = resolve(OUT_DIR, 'dashboard.html');
  writeFileSync(path, html);
  return path;
}

function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
