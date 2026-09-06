import { spawn, spawnSync } from 'node:child_process';
import { envStr } from './env';

export class GenerateError extends Error {}

interface SpawnRes {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

function spawnShim(cmd: string, args: string[], input: string, timeoutMs: number): Promise<SpawnRes> {
  return new Promise((res) => {
    const child = spawn(cmd, args, { shell: true, windowsHide: true });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
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

function cliOnPath(cmd: string): boolean {
  const finder = process.platform === 'win32' ? 'where' : 'which';
  return spawnSync(finder, [cmd], { windowsHide: true }).status === 0;
}

const AUTH_FAIL = /failed to authenticate|oauth session expired|not logged in|invalid api key/i;

function unwrapClaude(out: string): string {
  if (out.trim().length <= 400 && AUTH_FAIL.test(out)) {
    throw new GenerateError(`claude not authenticated: ${out.slice(0, 120)}`);
  }
  try {
    const parsed = JSON.parse(out) as { result?: string; text?: string; is_error?: boolean; terminal_reason?: string };
    const text = String(parsed?.result ?? parsed?.text ?? '').trim();
    if (parsed?.is_error || parsed?.terminal_reason === 'api_error') {
      throw new GenerateError(`claude error: ${text.slice(0, 200)}`);
    }
    if (text.length <= 400 && AUTH_FAIL.test(text)) throw new GenerateError(`claude not authenticated: ${text}`);
    if (text) return text;
  } catch (e) {
    if (e instanceof GenerateError) throw e;
  }
  return out.trim();
}

async function claude(prompt: string, timeoutMs: number): Promise<string> {
  if (!cliOnPath('claude')) throw new GenerateError('claude CLI not on PATH');
  const r = await spawnShim('claude', ['-p', '--output-format', 'json'], prompt, timeoutMs);
  if (r.timedOut) throw new GenerateError(`claude timed out after ${timeoutMs}ms`);
  const out = (r.stdout || '').trim();
  if (!out) throw new GenerateError(`claude empty (${r.code}): ${(r.stderr || '').slice(0, 200)}`);
  return unwrapClaude(out);
}

async function anthropicApi(prompt: string): Promise<string> {
  const key = envStr('ANTHROPIC_API_KEY');
  if (!key) throw new GenerateError('no ANTHROPIC_API_KEY');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new GenerateError(`anthropic HTTP ${res.status}`);
  const j = (await res.json()) as { content?: { text?: string }[] };
  const text = j.content?.map((c) => c.text ?? '').join('\n') ?? '';
  if (!text.trim()) throw new GenerateError('anthropic empty');
  return text;
}

export async function generateText(prompt: string, opts: { timeoutMs?: number } = {}): Promise<{ text: string; via: string }> {
  const timeoutMs = opts.timeoutMs ?? 120_000;
  const errors: string[] = [];
  try {
    return { text: await claude(prompt, timeoutMs), via: 'claude-cli' };
  } catch (e) {
    errors.push(String(e instanceof Error ? e.message : e));
  }
  try {
    return { text: await anthropicApi(prompt), via: 'anthropic-api' };
  } catch (e) {
    errors.push(String(e instanceof Error ? e.message : e));
  }
  throw new GenerateError(`no generator available: ${errors.join(' | ')}`);
}

export function extractJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : raw;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end <= start) throw new GenerateError('no JSON object in model output');
  return JSON.parse(body.slice(start, end + 1));
}

export { cliOnPath };
