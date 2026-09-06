import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PARENT_ROOT, ROOT } from './paths';

function parseEnvFile(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (line.trim().startsWith('#')) continue;
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (v.trim()) out[m[1]] = v;
  }
  return out;
}

let cache: Record<string, string> | null = null;

export function loadEnv(): Record<string, string> {
  if (cache) return cache;
  const merged: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === 'string' && v.trim()) merged[k] = v;
  }
  Object.assign(merged, parseEnvFile(resolve(PARENT_ROOT, '.env.local')));
  Object.assign(merged, parseEnvFile(resolve(PARENT_ROOT, 'marketing-agent', '.env')));
  Object.assign(merged, parseEnvFile(resolve(ROOT, '.env')));
  cache = merged;
  return merged;
}

export function envStr(key: string): string | null {
  const v = loadEnv()[key];
  return v && v.trim() ? v.trim() : null;
}

export function envOn(key: string): boolean {
  const v = (envStr(key) ?? '').toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

export function envHas(key: string): boolean {
  return Boolean(envStr(key));
}
