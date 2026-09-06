import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from '../db/index';
import { envStr } from '../env';

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
      // shell:true means child.kill() only kills the shell — the CLI grandchild
      // keeps the stdio pipes open and 'close' never fires (observed: a 180s
      // timeout surfacing after 292s). Kill the whole tree on Windows.
      if (process.platform === 'win32' && child.pid) {
        spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true });
      } else {
        child.kill('SIGKILL');
      }
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

/**
 * Some CLIs report a failed session on STDOUT with EXIT CODE 0 — the failure looks like a
 * successful, very short answer. On 2026-08-16 the claude CLI returned exactly
 * "Failed to authenticate: OAuth session expired and could not be refreshed" (72 chars, exit 0),
 * the router accepted it as the model's reply, and because it "succeeded" the fallback to codex
 * never fired: the creative loop wrote that string into its ideate/script stages and produced
 * zero variants. An unusable engine must FAIL so the next one gets a turn.
 */
const AUTH_FAIL_RE =
  /failed to authenticate|oauth session expired|could not be refreshed|not logged in|please (run )?login|session (has )?expired|invalid api key|unauthoriz/i;

/** True when a "successful" CLI reply is really an auth/session failure rather than content. */
function looksLikeAuthFailure(text: string): boolean {
  // Only judge SHORT replies: real generated copy can legitimately discuss logins.
  return text.trim().length <= 400 && AUTH_FAIL_RE.test(text);
}

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
  if (looksLikeAuthFailure(out)) throw new CliError(`gemini not authenticated: ${firstLine(out)}`);
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
  // CODEX_BIN: the Codex desktop app installs its own (older) CLI first on PATH and shadows the
  // npm one. On 2026-09-06 the app's 0.152.0 rejected the account's default model while npm's
  // 0.153.4 accepted it, and because spawnShim resolves via PATH the engine kept getting the
  // broken one. An explicit binary beats PATH order; unset, behaviour is unchanged.
  const codexBin = (envStr('CODEX_BIN') ?? process.env.CODEX_BIN ?? '').trim() || 'codex';
  const r = await spawnShim(codexBin, args, prompt, timeoutMs);
  if (r.timedOut) throw new CliError(`codex timed out after ${timeoutMs}ms`);
  if (RATE_RE.test(r.stderr)) throw new RateLimitError(`codex: ${firstLine(r.stderr) || 'rate limited'}`);
  let text = '';
  if (existsSync(outFile)) {
    text = readFileSync(outFile, 'utf8').trim();
    rmSync(outFile, { force: true });
  }
  if (!text) text = stripNoise(r.stdout || '');
  if (!text) throw new CliError(`codex empty output (code ${r.code}): ${firstLine(r.stderr)}`);
  if (looksLikeAuthFailure(text)) throw new CliError(`codex not authenticated: ${firstLine(text)}`);
  return { text, cli: 'codex', model, durationMs: Date.now() - t0 };
}

/**
 * Turn the claude CLI's `--output-format json` stdout into the model's actual answer, or throw.
 *
 * THE ENVELOPE IS NOT THE ANSWER — the failure that silently emptied a whole batch on 2026-08-17.
 *
 * An expired session comes back on STDOUT as ~880 characters of perfectly well-formed JSON whose
 * `result` is the 72-character string "Failed to authenticate: OAuth session expired and could not
 * be refreshed", alongside `"is_error": true` and `"terminal_reason": "api_error"` — and,
 * unhelpfully, `"subtype": "success"`.
 *
 * Both existing guards missed it. looksLikeAuthFailure() deliberately only judges replies under
 * 400 characters, because real ad copy can legitimately talk about logins — and the ENVELOPE is
 * 880 characters, so the check was asking the wrong string. The error text was then unwrapped out
 * of `result` and returned as the model's answer, with a cheerful runs_log row reading "72 chars".
 *
 * The consequence is worse than one bad reply: brain() only walks to the next CLI when a call
 * THROWS, so a "successful" auth error silently disables the entire fallback chain. That turned a
 * creative run into zero variants in eighteen seconds — ideate fell back to config seeds and every
 * scripting stage "succeeded" with the same 72 characters, which reads in the log exactly like a
 * model having a bad day rather than like a login that needs renewing.
 *
 * So the envelope's own error flags are honoured first, and the auth check is re-run on the
 * EXTRACTED text, where the 400-character rule is finally being applied to a reply rather than to
 * its packaging.
 */
export function interpretClaudeStdout(out: string): string {
  if (looksLikeAuthFailure(out)) throw new CliError(`claude not authenticated: ${firstLine(out)}`);
  let parsed: any;
  try {
    parsed = JSON.parse(out);
  } catch {
    return stripNoise(out); // not JSON — the CLI printed plain text
  }
  const text = String(parsed?.result ?? parsed?.text ?? '').trim();
  if (parsed?.is_error === true || parsed?.terminal_reason === 'api_error') {
    throw new CliError(`claude returned an error result (${String(parsed?.terminal_reason ?? 'is_error')}): ${firstLine(text || out)}`);
  }
  if (looksLikeAuthFailure(text)) throw new CliError(`claude not authenticated: ${firstLine(text)}`);
  return text || stripNoise(out);
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
  return { text: interpretClaudeStdout(out), cli: 'claude', model, durationMs: Date.now() - t0 };
}
