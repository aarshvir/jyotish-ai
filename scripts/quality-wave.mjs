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
 */

import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import http from 'node:http';

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

function waitForHttp(url, timeoutMs = 120_000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    function ping() {
      http
        .get(url, (res) => {
          res.resume();
          resolve(undefined);
        })
        .on('error', () => {
          if (Date.now() - started > timeoutMs) {
            reject(new Error(`Timeout waiting for ${url}`));
          } else {
            setTimeout(ping, 400);
          }
        });
    }
    ping();
  });
}

const baseUrl = (process.env.PLAYWRIGHT_BASE_URL || process.env.REPORT_E2E_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const healthUrl = `${baseUrl}/`;

async function main() {
  console.log('quality-wave — strict pipeline (no new paid tools)\n');

  run('Typecheck', 'npx', ['tsc', '--noEmit']);
  run('ESLint', 'npm', ['run', 'lint']);
  run('Production build', 'npm', ['run', 'build']);
  run('Vitest', 'npm', ['run', 'test']);

  loadBypassFromEnvLocal();

  process.env.PLAYWRIGHT_BASE_URL = baseUrl;
  process.env.E2E_BASE_URL = baseUrl;

  const skipServe = process.env.SKIP_SERVE === '1' || process.env.SKIP_SERVE === 'true';
  let serverProc = null;

  try {
    if (!skipServe) {
      console.log('\n▶ Starting production server (npm run start) …');
      serverProc = spawn('npm', ['run', 'start'], {
        stdio: 'inherit',
        shell: true,
        detached: false,
        env: { ...process.env, PORT: process.env.PORT || '3000' },
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
