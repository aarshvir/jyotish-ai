import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { db, ROOT } from '../db/index';
import { isKilled, killInfo, engageKill, releaseKill } from '../safety/killswitch';
import { readHeartbeat } from '../scheduler/heartbeat';

const PORT = Number(process.env.COCKPIT_PORT ?? 4317);

const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function caps(): Record<string, number> {
  try {
    const r = JSON.parse(readFileSync(resolve(ROOT, 'config', 'routing.json'), 'utf8'));
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries<any>(r.clis)) out[k] = v.dailyCap;
    return out;
  } catch {
    return {};
  }
}

function ageStr(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!isFinite(ms)) return '?';
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function page(): string {
  const d = db();
  const today = (sql: string) =>
    (d.prepare(sql).get() as { n: number }).n;

  const runsToday = today(`SELECT COUNT(*) n FROM runs_log WHERE ts >= datetime('now','start of day')`);
  const okToday = today(`SELECT COUNT(*) n FROM runs_log WHERE status='ok' AND ts >= datetime('now','start of day')`);
  const errToday = today(`SELECT COUNT(*) n FROM runs_log WHERE status='error' AND ts >= datetime('now','start of day')`);
  const pending = today(`SELECT COUNT(*) n FROM approval_queue WHERE status='pending'`);

  const usage = d
    .prepare(
      `SELECT cli, COUNT(*) n FROM runs_log WHERE cli IS NOT NULL AND status='ok' AND ts >= datetime('now','start of day') GROUP BY cli`,
    )
    .all() as { cli: string; n: number }[];
  const capMap = caps();
  const usageMap = Object.fromEntries(usage.map((u) => [u.cli, u.n]));

  const recent = d
    .prepare(`SELECT ts, loop, cli, tier, status, detail, duration_ms FROM runs_log ORDER BY id DESC LIMIT 15`)
    .all() as any[];

  const queue = d
    .prepare(`SELECT id, lane, linter_verdict, status, item, channel, ts FROM approval_queue ORDER BY id DESC LIMIT 15`)
    .all() as any[];

  const content = d
    .prepare(`SELECT type, status, COUNT(*) n FROM content_library GROUP BY type, status ORDER BY type, status`)
    .all() as { type: string; status: string; n: number }[];
  const contentRows = content.length
    ? content.map((c) => `<tr><td>${esc(c.type)}</td><td>${esc(c.status)}</td><td>${c.n}</td></tr>`).join('')
    : `<tr><td colspan="3" style="color:#9ca3af">no content yet</td></tr>`;

  const hb = readHeartbeat();
  const killed = isKilled();
  const ki = killInfo();

  const statusColor = (s: string) =>
    s === 'ok' ? '#4ade80' : s === 'error' ? '#f87171' : s === 'killed' ? '#fb923c' : '#9ca3af';
  const verdictColor = (v: string) =>
    v === 'pass' ? '#4ade80' : v === 'flag' ? '#fbbf24' : v === 'block' ? '#f87171' : '#9ca3af';

  const cliRows = ['gemini', 'codex', 'claude']
    .map((c) => {
      const used = usageMap[c] ?? 0;
      const cap = capMap[c] ?? 0;
      const pct = cap ? Math.min(100, Math.round((used / cap) * 100)) : 0;
      return `<tr><td>${c}</td><td>${used} / ${cap}</td><td><div class="bar"><div class="fill" style="width:${pct}%"></div></div></td></tr>`;
    })
    .join('');

  const recentRows = recent
    .map(
      (r) =>
        `<tr><td class="mono">${esc(r.ts)}</td><td>${esc(r.loop)}</td><td>${esc(r.cli ?? '—')}</td><td>${esc(
          r.tier ?? '—',
        )}</td><td style="color:${statusColor(r.status)}">${esc(r.status)}</td><td>${esc(r.detail ?? '')}</td><td class="mono">${
          r.duration_ms ? r.duration_ms + 'ms' : ''
        }</td></tr>`,
    )
    .join('');

  const queueRows = queue.length
    ? queue
        .map(
          (r) =>
            `<tr><td>${r.id}</td><td>${esc(r.lane)}</td><td style="color:${verdictColor(r.linter_verdict)}">${esc(
              r.linter_verdict ?? '—',
            )}</td><td>${esc(r.status)}</td><td>${esc(String(r.item).slice(0, 80))}</td></tr>`,
        )
        .join('')
    : `<tr><td colspan="5" style="color:#9ca3af">queue empty — nothing awaiting review</td></tr>`;

  const hbRows = Object.entries(hb)
    .filter(([k]) => k !== '_last')
    .map(
      ([loop, v]: any) =>
        `<tr><td>${esc(loop)}</td><td class="mono">${esc(v.at)}</td><td>${esc(ageStr(v.at))}</td><td>${esc(v.detail)}</td></tr>`,
    )
    .join('') || `<tr><td colspan="4" style="color:#9ca3af">no heartbeats yet</td></tr>`;

  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="10">
<title>VedicHour Marketing Cockpit</title>
<style>
  :root{--amber:#d4af37;--bg:#0a0a1a;--bg2:#0d0d2b;--card:#14142e;--line:#26264a;--text:#e8e8f0;--muted:#9ca3af}
  *{box-sizing:border-box}body{margin:0;background:linear-gradient(160deg,var(--bg),var(--bg2));color:var(--text);font-family:'DM Sans',system-ui,sans-serif;padding:24px}
  h1{font-family:'Cormorant Garamond',serif;color:var(--amber);margin:0 0 2px;font-size:30px}
  .sub{color:var(--muted);margin-bottom:20px;font-size:13px}
  .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:18px}
  .card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px}
  .card .n{font-size:30px;font-weight:700;color:var(--amber)}.card .l{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.05em}
  .panel{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px;margin-bottom:16px}
  .panel h2{font-size:14px;text-transform:uppercase;letter-spacing:.06em;color:var(--amber);margin:0 0 12px}
  table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:7px 9px;border-bottom:1px solid var(--line);vertical-align:top}
  th{color:var(--muted);font-weight:600;font-size:11px;text-transform:uppercase}
  .mono{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted)}
  .bar{background:#1f1f3d;border-radius:6px;height:8px;width:160px;overflow:hidden}.fill{background:var(--amber);height:100%}
  .kill{display:flex;align-items:center;justify-content:space-between;border-radius:12px;padding:14px 18px;margin-bottom:18px;font-weight:600}
  .kill.on{background:#3b0d0d;border:1px solid #f87171;color:#fca5a5}.kill.off{background:#0d2818;border:1px solid #2f7d52;color:#86efac}
  button{font:inherit;font-weight:600;border:0;border-radius:8px;padding:8px 16px;cursor:pointer}
  .btn-kill{background:#f87171;color:#160000}.btn-revive{background:#4ade80;color:#001405}
  .cols{display:grid;grid-template-columns:1fr 1fr;gap:16px}
</style></head><body>
  <h1>VedicHour Marketing Cockpit</h1>
  <div class="sub">Phase 0 · local engine · reasoning cost ≈ $0 · auto-refreshes every 10s</div>

  <div class="kill ${killed ? 'on' : 'off'}">
    <span>${killed ? `&#x1F6D1; KILL-SWITCH ENGAGED — all spend/sending halted. (${esc(ki?.reason)}, ${esc(ki?.engaged_at)})` : '&#x2705; System live — kill-switch off. All loops may run.'}</span>
    <form method="POST" action="${killed ? '/revive' : '/kill'}" style="margin:0">
      <button class="${killed ? 'btn-revive' : 'btn-kill'}">${killed ? 'Revive' : 'KILL ALL'}</button>
    </form>
  </div>

  <div class="grid">
    <div class="card"><div class="n">${runsToday}</div><div class="l">Runs today</div></div>
    <div class="card"><div class="n" style="color:#4ade80">${okToday}</div><div class="l">OK</div></div>
    <div class="card"><div class="n" style="color:${errToday ? '#f87171' : 'var(--amber)'}">${errToday}</div><div class="l">Errors</div></div>
    <div class="card"><div class="n">${pending}</div><div class="l">Pending approvals</div></div>
  </div>

  <div class="cols">
    <div class="panel"><h2>Brain usage today (fair-use caps)</h2>
      <table><tr><th>CLI</th><th>Calls / cap</th><th></th></tr>${cliRows}</table></div>
    <div class="panel"><h2>Heartbeats</h2>
      <table><tr><th>Loop</th><th>Last beat</th><th>Age</th><th>Detail</th></tr>${hbRows}</table></div>
  </div>

  <div class="panel"><h2>Approval queue (weekly review)</h2>
    <table><tr><th>#</th><th>Lane</th><th>Linter</th><th>Status</th><th>Item</th></tr>${queueRows}</table></div>

  <div class="panel"><h2>Content bank</h2>
    <table><tr><th>Type</th><th>Status</th><th>Count</th></tr>${contentRows}</table></div>

  <div class="panel"><h2>Recent runs</h2>
    <table><tr><th>Time</th><th>Loop</th><th>CLI</th><th>Tier</th><th>Status</th><th>Detail</th><th>ms</th></tr>${recentRows}</table></div>
</body></html>`;
}

export function startCockpit(): void {
  const server = createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/kill') {
      engageKill('cockpit');
      res.writeHead(302, { Location: '/' });
      return res.end();
    }
    if (req.method === 'POST' && req.url === '/revive') {
      releaseKill();
      res.writeHead(302, { Location: '/' });
      return res.end();
    }
    try {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(page());
    } catch (e: any) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`cockpit error: ${e?.message ?? e}`);
    }
  });
  server.listen(PORT, () => {
    console.log(`VedicHour cockpit → http://localhost:${PORT}`);
  });
}
