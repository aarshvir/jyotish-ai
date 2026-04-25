#!/usr/bin/env node
/**
 * Sequential quality gate: tsc → lint → build → vitest → (optional) report E2E → Playwright smoke.
 *
 * Starts `npm run start` after build unless SKIP_SERVE=1 (use an already-running server).
 *
 * Env:
 *   SKIP_SERVE=1           — do not spawn `npm run start`; use PLAYWRIGHT_BASE_URL (default http://127.0.0.1:3000)
 *   SKIP_REPORT_E2E=1      — skip scripts/test-report-e2e.mjs (needs BYPASS_SECRET / E2E_BYPASS)
 *   PLAYWRIGHT_BASE_URL    — base URL for Playwright + report E2E (also sets E2E_BASE_URL)
 *   QUALITY_WAVE_PORT        — fixed port for spawned `next start` (default: random free port)
 *   (sets REPORT_PIPELINE_INLINE=1 for the child so /api/reports/start can run inline without Inngest)
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { join } from 'node:path';

function loadBypassFromEnvLocal() {
  if (process.env.E2E_BYPASS?.trim()) return;
  try {
    const raw = readFileSync(join(process.cwd(), '.env.local'), 'utf8');
    const m = raw.match(/^BYPASS_SECRET[ \t]*=[ \t]*(.*)$/m);
    if (m) {
      let v = m[1].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env.E2E_BYPASS = v;
    }
  } catch {
    /* no .env.local */
  }
}

function run(label, cmd, args) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n▶ ${label}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

/** Next.js on Windows can intermittently throw PageNotFoundError during "collecting page data" on a random route. Retry after removing .next. */
function runProductionBuildWithRetries(maxAttempts = 3) {
  const nextDir = join(process.cwd(), '.next');
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const label =
      attempt === 1
        ? 'Production build'
        : `Production build (retry ${attempt}/${maxAttempts})`;
    console.log(
      `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n▶ ${label}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    );
    const r = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', shell: true });
    if (r.status === 0) return;
    if (attempt < maxAttempts) {
      console.warn(
        '\n⚠ build failed (Next.js occasional ENOENT for a route on Windows) — removing .next and retrying…\n',
      );
      try {
        if (existsSync(nextDir)) rmSync(nextDir, { recursive: true, force: true });
      } catch (e) {
        console.warn('  (could not remove .next:)', e);
      }
    } else {
      process.exit(r.status ?? 1);
    }
  }
}

/** Pick a free TCP port so we do not hit a stale `next` from a previous run. */
function getFreePort() {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const addr = s.address();
      const p = typeof addr === 'object' && addr && 'port' in addr ? addr.port : 30_000;
      s.close((err) => (err != null ? reject(err) : resolve(String(p))));
    });
  });
}

/** Poll until the server answers (Node 18+ fetch; supports http and https). */
async function waitForHttp(url, timeoutMs = 120_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url, { method: 'GET', redirect: 'manual' });
      res.body?.cancel?.();
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  throw new Error(`Timeout waiting for ${url}`);
}

async function main() {
  console.log('quality-wave — strict pipeline (no new paid tools)\n');

  run('Typecheck', 'npx', ['tsc', '--noEmit']);
  run('ESLint', 'npm', ['run', 'lint']);
  runProductionBuildWithRetries(3);
  run('Vitest', 'npm', ['run', 'test']);

  loadBypassFromEnvLocal();

  const skipServe = process.env.SKIP_SERVE === '1' || process.env.SKIP_SERVE === 'true';
  /** Random free port avoids stale `next` + EADDRINUSE; override with QUALITY_WAVE_PORT. */
  const servePort = skipServe
    ? String(process.env.PORT || '3000')
    : String(process.env.QUALITY_WAVE_PORT || (await getFreePort()));
  const baseUrl = (
    skipServe
      ? (process.env.PLAYWRIGHT_BASE_URL || process.env.REPORT_E2E_URL || `http://127.0.0.1:${servePort}`)
      : `http://127.0.0.1:${servePort}`
  ).replace(/\/$/, '');
  const healthUrl = `${baseUrl}/`;

  process.env.PLAYWRIGHT_BASE_URL = baseUrl;
  process.env.E2E_BASE_URL = baseUrl;

  let serverProc = null;

  try {
    if (!skipServe) {
      console.log(`\n▶ Starting production server on port ${servePort} (npm run start) …`);
      serverProc = spawn('npm', ['run', 'start'], {
        stdio: 'inherit',
        shell: true,
        detached: false,
        env: {
          ...process.env,
          PORT: servePort,
          /** Allow /api/reports/start to run the full pipeline when using `next start` (NODE_ENV=production) without Inngest. */
          REPORT_PIPELINE_INLINE: '1',
        },
      });
      serverProc.on('error', (err) => {
        console.error(err);
        process.exit(1);
      });
      try {
        await waitForHttp(healthUrl);
        console.log(`✓ Server responded at ${healthUrl}`);
      } catch (e) {
        console.error(e);
        process.exit(1);
      }
    } else {
      console.log('\n▶ SKIP_SERVE=1 — using existing server at', baseUrl);
      try {
        await waitForHttp(healthUrl, 5_000);
      } catch {
        console.error(`No server at ${healthUrl}. Start the app or unset SKIP_SERVE.`);
        process.exit(1);
      }
    }

    if (process.env.SKIP_REPORT_E2E === '1' || process.env.SKIP_REPORT_E2E === 'true') {
      console.log('\n▶ SKIP_REPORT_E2E=1 — skipping scripts/test-report-e2e.mjs');
    } else if (!process.env.E2E_BYPASS?.trim()) {
      console.warn('\n⚠ E2E_BYPASS / BYPASS_SECRET not set — skipping report pipeline test (set BYPASS_SECRET in .env.local or export E2E_BYPASS).');
      console.warn('  To force skip: SKIP_REPORT_E2E=1');
    } else {
      run('Report BRD E2E (test-report-e2e.mjs)', 'npm', ['run', 'test:e2e']);
    }

    run('Playwright smoke', 'npx', ['playwright', 'test']);

    console.log('\n✓ quality-wave completed successfully.\n');
  } finally {
    if (serverProc) {
      console.log('\n▶ Stopping production server …');
      serverProc.kill('SIGTERM');
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
