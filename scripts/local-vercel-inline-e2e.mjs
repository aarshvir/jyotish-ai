#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const envFile = process.argv[2] || '.env.vercel.production.local';
const port = process.argv[3] || '3017';
const baseUrl = `http://localhost:${port}`;

function parseEnvFile(path) {
  const out = {};
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '').replace(/\\r|\\n/g, '').trim();
    if (key) out[key] = value;
  }
  return out;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 45_000) {
  const started = Date.now();
  let lastError = '';
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`${url}/`, { signal: AbortSignal.timeout(2_000) });
      return;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
    await wait(1_000);
  }
  throw new Error(`server did not become ready: ${lastError}`);
}

function run(command, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
      ...opts,
    });
    child.stdout?.on('data', (chunk) => process.stderr.write(`[e2e] ${chunk}`));
    child.stderr?.on('data', (chunk) => process.stderr.write(`[e2e] ${chunk}`));
    child.on('exit', (code, signal) => resolve({ code, signal }));
  });
}

const pulledEnv = parseEnvFile(envFile);
const env = {
  ...process.env,
  ...pulledEnv,
  INNGEST_EVENT_KEY: '',
  REPORT_PIPELINE_INLINE: 'true',
  REPORT_PIPELINE_BUDGET_MS: process.env.REPORT_PIPELINE_BUDGET_MS || '255000',
  PORT: port,
};

if (process.env.FORCE_OPENAI_ONLY === '1') {
  env.ANTHROPIC_API_KEY = '';
}

const bypass = pulledEnv.BYPASS_SECRET;
if (!bypass) {
  console.error(`[local-vercel-inline-e2e] BYPASS_SECRET missing from ${envFile}`);
  process.exit(1);
}

console.error(`[local-vercel-inline-e2e] starting Next on ${baseUrl} with ${envFile}`);
const server = spawn('npm.cmd', ['start', '--', '-p', port], {
  env,
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: process.platform === 'win32',
});

server.stdout.on('data', (chunk) => process.stderr.write(`[next] ${chunk}`));
server.stderr.on('data', (chunk) => process.stderr.write(`[next] ${chunk}`));

let serverExited = false;
server.on('exit', (code, signal) => {
  serverExited = true;
  console.error(`[local-vercel-inline-e2e] next exited code=${code} signal=${signal}`);
});

let exitCode = 1;
try {
  await waitForServer(baseUrl);
  console.error(`[local-vercel-inline-e2e] server ready on ${baseUrl}`);
  if (serverExited) throw new Error('next exited before e2e started');
  try {
    const debugRes = await fetch(`${baseUrl}/api/debug/report-status?bypass=${encodeURIComponent(bypass)}`, {
      signal: AbortSignal.timeout(45_000),
    });
    const debugText = await debugRes.text();
    console.error(`[local-vercel-inline-e2e] debug status HTTP ${debugRes.status}: ${debugText.slice(0, 1200)}`);
  } catch (e) {
    console.error('[local-vercel-inline-e2e] debug status probe failed:', e instanceof Error ? e.message : String(e));
  }
  console.error('[local-vercel-inline-e2e] running report e2e');
  const result = await run('node', ['scripts/test-report-e2e.mjs', baseUrl, bypass], {
    env: { ...env, E2E_BYPASS: bypass },
  });
  console.error(`[local-vercel-inline-e2e] report e2e exited code=${result.code} signal=${result.signal}`);
  exitCode = result.code ?? 1;
} catch (e) {
  console.error('[local-vercel-inline-e2e]', e instanceof Error ? e.message : String(e));
} finally {
  if (!serverExited) {
    server.kill('SIGTERM');
    await wait(1_000);
    if (!serverExited) server.kill('SIGKILL');
  }
}

process.exit(exitCode);
