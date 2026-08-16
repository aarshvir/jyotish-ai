// Shared Supabase REST access for the campaign loops (sync / stats / insights).
// Reads creds from marketing-agent/.env first, then the app's ../.env.local,
// then process.env. Service-role key only — these loops run locally, never in
// a browser. All callers must fail SOFT until the owner runs RUN_IN_SUPABASE.sql
// (missing tables surface as MissingTableError, not a crash).

import { parseEnvFile, CANONICAL_ENV_FILE, APP_ENV_FILE } from './env';

export { loadEnv } from './env';

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
  push('marketing-agent/.env', parseEnvFile(CANONICAL_ENV_FILE));
  push('../.env.local', parseEnvFile(APP_ENV_FILE));
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
