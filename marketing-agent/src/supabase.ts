// Shared Supabase REST access for the campaign loops (sync / stats / insights).
// Reads creds from marketing-agent/.env first, then the app's ../.env.local,
// then process.env. Service-role key only — these loops run locally, never in
// a browser. All callers must fail SOFT until the owner runs RUN_IN_SUPABASE.sql
// (missing tables surface as MissingTableError, not a crash).

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from './db/index';

function parseEnvFile(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (line.trim().startsWith('#')) continue;
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}

let _env: Record<string, string> | null = null;

/** Merged env: ../.env.local < marketing-agent/.env < process.env */
export function loadEnv(): Record<string, string> {
  if (_env) return _env;
  const merged: Record<string, string> = {
    ...parseEnvFile(resolve(ROOT, '..', '.env.local')),
    ...parseEnvFile(resolve(ROOT, '.env')),
  };
  for (const [k, v] of Object.entries(process.env)) if (typeof v === 'string' && v) merged[k] = v;
  _env = merged;
  return merged;
}

export interface Sb {
  base: string;
  key: string;
}

function credCandidates(): { source: string; sb: Sb }[] {
  const out: { source: string; sb: Sb }[] = [];
  const push = (source: string, env: Record<string, string | undefined>) => {
    const base = (env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
    const key = env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (base && key && !out.some((c) => c.sb.base === base && c.sb.key === key)) out.push({ source, sb: { base, key } });
  };
  push('marketing-agent/.env', parseEnvFile(resolve(ROOT, '.env')));
  push('../.env.local', parseEnvFile(resolve(ROOT, '..', '.env.local')));
  push('process.env', process.env as Record<string, string | undefined>);
  return out;
}

let _sb: Sb | null | undefined;

/**
 * First WORKING service-role cred pair (marketing-agent/.env, then the app's
 * ../.env.local, then process.env) — probed with a cheap authenticated request,
 * because a stale key in one file must not take the whole pipeline down.
 * null when nothing works — callers log and skip, never crash.
 */
export async function resolveSupabase(): Promise<Sb | null> {
  if (_sb !== undefined) return _sb;
  for (const c of credCandidates()) {
    try {
      const res = await fetch(`${c.sb.base}/rest/v1/`, { headers: { apikey: c.sb.key, Authorization: `Bearer ${c.sb.key}` } });
      if (res.ok) {
        if (c.source !== 'marketing-agent/.env') console.log(`[supabase] using creds from ${c.source}`);
        _sb = c.sb;
        return _sb;
      }
      console.warn(`[supabase] creds from ${c.source} rejected (HTTP ${res.status}) — trying next source.`);
    } catch (e: any) {
      console.warn(`[supabase] probe failed for ${c.source}: ${String(e?.message ?? e).slice(0, 80)}`);
    }
  }
  _sb = null;
  return _sb;
}

/** Thrown when a marketing_* table has not been created yet (RUN_IN_SUPABASE.sql pending). */
export class MissingTableError extends Error {}

export async function sbRequest(
  sb: Sb,
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>,
): Promise<any> {
  const res = await fetch(`${sb.base}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: sb.key,
      Authorization: `Bearer ${sb.key}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...extraHeaders,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    if (res.status === 404 || /42P01|PGRST205|does not exist|could not find the table/i.test(text)) {
      throw new MissingTableError(`Supabase table missing for "${path.split('?')[0]}" — paste RUN_IN_SUPABASE.sql in the Supabase SQL editor.`);
    }
    throw new Error(`Supabase ${method} ${path.split('?')[0]} -> HTTP ${res.status}: ${text.slice(0, 180)}`);
  }
  return text ? JSON.parse(text) : null;
}

export const sbGet = (sb: Sb, path: string) => sbRequest(sb, 'GET', path);
export const sbInsert = (sb: Sb, table: string, rows: unknown) =>
  sbRequest(sb, 'POST', table, rows, { Prefer: 'return=minimal' });
export const sbPatch = (sb: Sb, path: string, patch: unknown) =>
  sbRequest(sb, 'PATCH', path, patch, { Prefer: 'return=minimal' });
