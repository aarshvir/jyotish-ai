import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from '../db/index';

let cache: Record<string, string> | null = null;

/**
 * Read secrets/config from the process env first, then marketing-agent/.env, then the
 * web app's ../.env.local — the same precedence src/email/send-launch.ts already uses.
 * Nothing is ever written back; keys stay in the files they came from.
 */
export function renderEnv(): Record<string, string> {
  if (cache) return cache;
  const out: Record<string, string> = {};
  for (const f of [resolve(ROOT, '.env'), resolve(ROOT, '..', '.env.local')]) {
    if (!existsSync(f)) continue;
    for (const line of readFileSync(f, 'utf8').split(/\r?\n/)) {
      if (line.trim().startsWith('#')) continue;
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
      if (!m) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (out[m[1]] === undefined) out[m[1]] = v;
    }
  }
  cache = { ...out, ...stripEmpty(process.env as Record<string, string | undefined>) };
  return cache;
}

function stripEmpty(o: Record<string, string | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(o)) if (v) out[k] = v;
  return out;
}

export function envStr(key: string): string | null {
  const v = renderEnv()[key];
  return v && v.trim() ? v.trim() : null;
}

export function envNum(key: string, fallback: number): number {
  const v = envStr(key);
  const n = v === null ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
}
