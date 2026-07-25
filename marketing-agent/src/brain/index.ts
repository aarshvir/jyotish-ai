import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT, db, logRun } from '../db/index';
import { callGemini, callCodex, callClaude, cliAvailable, RateLimitError, type CliResult } from './clis';

export type Tier = 'bulk' | 'smart' | 'code';

interface CliCfg {
  enabled: boolean | 'auto';
  model: string | null;
  dailyCap: number;
  minIntervalMs: number;
  timeoutMs: number;
}
interface Routing {
  killSwitchFile: string;
  tiers: Record<string, { clis: string[] }>;
  clis: Record<string, CliCfg>;
}

function loadRouting(): Routing {
  return JSON.parse(readFileSync(resolve(ROOT, 'config', 'routing.json'), 'utf8'));
}

const lastCall = new Map<string, number>();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Count today's successful calls for a CLI (enforces fair-use daily cap). */
function usedToday(cli: string): number {
  const row = db()
    .prepare(`SELECT COUNT(*) n FROM runs_log WHERE cli=? AND status='ok' AND ts >= datetime('now','start of day')`)
    .get(cli) as { n: number };
  return row.n;
}

function isEnabled(cli: string, cfg: CliCfg): boolean {
  if (cfg.enabled === 'auto') return cliAvailable(cli);
  return cfg.enabled === true && cliAvailable(cli);
}

async function callOne(cli: string, cfg: CliCfg, prompt: string): Promise<CliResult> {
  const last = lastCall.get(cli) ?? 0;
  const wait = cfg.minIntervalMs - (Date.now() - last);
  if (wait > 0) await sleep(wait);
  lastCall.set(cli, Date.now());
  if (cli === 'gemini') return callGemini(prompt, cfg.model, cfg.timeoutMs);
  if (cli === 'codex') return callCodex(prompt, cfg.model, cfg.timeoutMs);
  if (cli === 'claude') return callClaude(prompt, cfg.model, cfg.timeoutMs);
  throw new Error(`unknown cli "${cli}"`);
}

const estTokens = (a: string, b: string) => Math.round((a.length + b.length) / 4);

export interface BrainOpts {
  tier?: Tier;
  loop?: string;
}

/**
 * The reasoning router. Picks a CLI by tier preference, spreads load across the
 * three subscriptions, throttles, enforces daily caps, and falls back to the
 * next CLI on rate-limit or error. Reasoning cost ≈ $0 (subscriptions, not APIs).
 */
export async function brain(prompt: string, opts: BrainOpts = {}): Promise<CliResult> {
  const tier = opts.tier ?? 'bulk';
  const loop = opts.loop ?? 'brain';
  const routing = loadRouting();
  const order = routing.tiers[tier]?.clis ?? ['gemini', 'codex'];
  const errors: string[] = [];

  for (const cli of order) {
    const cfg = routing.clis[cli];
    if (!cfg) continue;
    if (!isEnabled(cli, cfg)) {
      errors.push(`${cli}: disabled/unavailable`);
      continue;
    }
    if (usedToday(cli) >= cfg.dailyCap) {
      errors.push(`${cli}: daily cap (${cfg.dailyCap}) reached`);
      logRun({ loop, cli, tier, status: 'skipped', detail: 'daily cap reached' });
      continue;
    }
    const t0 = Date.now();
    try {
      const res = await callOne(cli, cfg, prompt);
      logRun({
        loop,
        cli,
        tier,
        status: 'ok',
        detail: `${res.text.length} chars`,
        tokens_est: estTokens(prompt, res.text),
        duration_ms: res.durationMs,
      });
      return res;
    } catch (e: any) {
      const rate = e instanceof RateLimitError;
      const msg = String(e?.message ?? e);
      errors.push(`${cli}: ${rate ? 'RATE-LIMIT' : 'ERROR'} — ${msg}`);
      logRun({
        loop,
        cli,
        tier,
        status: 'error',
        detail: `${rate ? 'rate-limited' : 'error'}: ${msg.slice(0, 200)}`,
        duration_ms: Date.now() - t0,
      });
      // fall through to the next CLI in the tier
    }
  }
  throw new Error(`brain(tier=${tier}) — all CLIs failed:\n  ${errors.join('\n  ')}`);
}
