/**
 * Canonical secrets loader.
 *
 * Owner law: keys live in ONE file, `marketing-agent/.env`. Other layers are fallbacks
 * only. Last-applied wins, so a dummy Cloud Agent process.env cannot shadow a real
 * FAL_KEY sitting in that file.
 *
 * Precedence (last wins): process.env → ../.env.local → marketing-agent/.env
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from './db/index';

export const CANONICAL_ENV_FILE = resolve(ROOT, '.env');
export const APP_ENV_FILE = resolve(ROOT, '..', '.env.local');

export type EnvSource = 'marketing-agent/.env' | '../.env.local' | 'process.env';

export function parseEnvFile(file: string): Record<string, string> {
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

/** Last layer wins. Used by tests with injected maps so we never touch real secrets. */
export function mergeEnvLayers(
  layers: { label: EnvSource; env: Record<string, string | undefined> }[],
): { env: Record<string, string>; sources: Record<string, EnvSource> } {
  const env: Record<string, string> = {};
  const sources: Record<string, EnvSource> = {};
  for (const layer of layers) {
    for (const [k, v] of Object.entries(layer.env)) {
      if (typeof v !== 'string' || !v.trim()) continue;
      env[k] = v;
      sources[k] = layer.label;
    }
  }
  return { env, sources };
}

let cache: { env: Record<string, string>; sources: Record<string, EnvSource> } | null = null;

export function resetEnvCache(): void {
  cache = null;
}

function load(): { env: Record<string, string>; sources: Record<string, EnvSource> } {
  if (cache) return cache;
  cache = mergeEnvLayers([
    { label: 'process.env', env: process.env },
    { label: '../.env.local', env: parseEnvFile(APP_ENV_FILE) },
    { label: 'marketing-agent/.env', env: parseEnvFile(CANONICAL_ENV_FILE) },
  ]);
  return cache;
}

export function loadEnv(): Record<string, string> {
  return load().env;
}

export function envSource(key: string): EnvSource | 'unset' {
  return load().sources[key] ?? 'unset';
}

export function envFilePresent(): boolean {
  return existsSync(CANONICAL_ENV_FILE);
}

export function envStr(key: string): string | null {
  const v = loadEnv()[key];
  return v && v.trim() ? v.trim() : null;
}

export function envNum(key: string, fallback: number): number {
  const v = envStr(key);
  const n = v === null ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Names the doctor prints. Never include secret values. */
export const DOCTOR_KEYS = [
  'FAL_KEY',
  'SARVAM_API_KEY',
  'YOUTUBE_API_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SYNC_API_KEY',
] as const;

export function printEnvDoctor(): void {
  console.log(`\nSecrets file: ${CANONICAL_ENV_FILE}`);
  console.log(`  ${envFilePresent() ? 'present (gitignored — values never printed)' : 'MISSING — this clone has no marketing-agent/.env (gitignored; Cloud Agents do not receive your laptop file)'}`);
  for (const k of DOCTOR_KEYS) {
    const src = envSource(k);
    const mark = src === 'unset' ? 'NOT set' : `set (${src})`;
    console.log(`  ${k.padEnd(28)} ${mark}`);
  }
}
