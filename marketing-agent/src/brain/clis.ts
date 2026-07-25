import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from '../db/index';

const TMP = resolve(ROOT, 'tmp');

export class RateLimitError extends Error {}
export class CliError extends Error {}

export interface CliResult {
  text: string;
  cli: string;
  model: string | null;
  durationMs: number;
}

interface SpawnRes {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

/**
 * Spawn a CLI shim (.cmd/.ps1 on Windows) and feed the prompt via STDIN.
 * Feeding via stdin (not argv) avoids shell-quoting multi-line marketing copy.
 */
function spawnShim(cmd: string, args: string[], input: string, timeoutMs: number): Promise<SpawnRes> {
  return new Promise((res) => {
    const child = spawn(cmd, args, { shell: true, windowsHide: true });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', (e) => {
      clearTimeout(timer);
      res({ code: -1, stdout, stderr: `${stderr}\n${String(e)}`, timedOut });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      res({ code, stdout, stderr, timedOut });
    });
    child.stdin.write(input);
    child.stdin.end();
  });
}

const RATE_RE = /\b429\b|rate.?limit|RESOURCE_EXHAUSTED|No capacity|quota exceeded|usage limit|too many requests/i;

function firstLine(s: string): string {
  const l = (s || '')
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)[0];
  return (l ?? '').slice(0, 300);
}

/** Drop known CLI chrome that occasionally leaks into stdout. */
function stripNoise(s: string): string {
  return s
    .split('\n')
    .filter(
      (l) =>
        !/256-color|Ripgrep is not available|Falling back to GrepTool|DeprecationWarning|ExperimentalWarning|\(node:\d+\)/i.test(
          l,
        ),
    )
    .join('\n')
    .trim();
}

const availCache = new Map<string, boolean>();
/** Is a CLI binary resolvable on PATH? (cached) */
export function cliAvailable(cmd: string): boolean {
  if (availCache.has(cmd)) return availCache.get(cmd)!;
  const finder = process.platform === 'win32' ? 'where' : 'which';
  const r = spawnSync(finder, [cmd], { windowsHide: true });
  const ok = r.status === 0;
  availCache.set(cmd, ok);
  return ok;
}

export async function callGemini(prompt: string, model: string | null, timeoutMs: number): Promise<CliResult> {
  const t0 = Date.now();
  const m = model ?? 'gemini-2.5-flash';
  const r = await spawnShim('gemini', ['-m', m], prompt, timeoutMs);
  const out = stripNoise(r.stdout || '');
  if (r.timedOut) throw new CliError(`gemini timed out after ${timeoutMs}ms`);
  if (RATE_RE.test(r.stderr) || RATE_RE.test(r.stdout)) throw new RateLimitError(`gemini: ${firstLine(r.stderr) || 'rate limited'}`);
  if (!out) throw new CliError(`gemini empty output (code ${r.code}): ${firstLine(r.stderr)}`);
  return { text: out, cli: 'gemini', model: m, durationMs: Date.now() - t0 };
}

export async function callCodex(prompt: string, model: string | null, timeoutMs: number): Promise<CliResult> {
  const t0 = Date.now();
  if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });
  const outFile = resolve(TMP, `codex-${process.pid}-${t0}.txt`);
  rmSync(outFile, { force: true });
  const args = ['exec', '-s', 'read-only', '--skip-git-repo-check', '--color', 'never'];
  if (model) args.push('-m', model);
  args.push('-o', `"${outFile}"`, '-');
  const r = await spawnShim('codex', args, prompt, timeoutMs);
  if (r.timedOut) throw new CliError(`codex timed out after ${timeoutMs}ms`);
  if (RATE_RE.test(r.stderr)) throw new RateLimitError(`codex: ${firstLine(r.stderr) || 'rate limited'}`);
  let text = '';
  if (existsSync(outFile)) {
    text = readFileSync(outFile, 'utf8').trim();
    rmSync(outFile, { force: true });
  }
  if (!text) text = stripNoise(r.stdout || '');
  if (!text) throw new CliError(`codex empty output (code ${r.code}): ${firstLine(r.stderr)}`);
  return { text, cli: 'codex', model, durationMs: Date.now() - t0 };
}

export async function callClaude(prompt: string, model: string | null, timeoutMs: number): Promise<CliResult> {
  const t0 = Date.now();
  const args = ['-p', '--output-format', 'json'];
  if (model) args.push('--model', model);
  const r = await spawnShim('claude', args, prompt, timeoutMs);
  if (r.timedOut) throw new CliError(`claude timed out after ${timeoutMs}ms`);
  if (RATE_RE.test(r.stderr)) throw new RateLimitError(`claude: ${firstLine(r.stderr) || 'rate limited'}`);
  const out = (r.stdout || '').trim();
  if (!out) throw new CliError(`claude empty output (code ${r.code}): ${firstLine(r.stderr)}`);
  try {
    const j = JSON.parse(out);
    const text = String(j.result ?? j.text ?? '').trim();
    if (text) return { text, cli: 'claude', model, durationMs: Date.now() - t0 };
  } catch {
    // not JSON — fall through to raw
  }
  return { text: stripNoise(out), cli: 'claude', model, durationMs: Date.now() - t0 };
}
