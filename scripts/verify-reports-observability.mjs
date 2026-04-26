/**
 * Smoke-check that `reports.generation_log` and `generation_trace_id` exist
 * and are readable (run after `supabase/manual-apply/reports-observability.sql`).
 *
 *   node scripts/verify-reports-observability.mjs
 *
 * Env: load from .env.local (SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL) or process.env.
 */
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

const envPath = resolve('.env.local');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) return;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !process.env[key]) process.env[key] = val;
  });
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await db
  .from('reports')
  .select('id, generation_log, generation_trace_id')
  .limit(1);

if (error) {
  const m = error.message ?? String(error);
  if (m.includes('generation_log') || m.includes('schema cache') || m.includes('generation_trace')) {
    console.error('FAIL: columns or schema — apply supabase/manual-apply/reports-observability.sql\n', m);
    process.exit(1);
  }
  console.error('Query error:', m);
  process.exit(1);
}

console.log('OK: can select generation_log + generation_trace_id (rows:', data?.length ?? 0, ')');
process.exit(0);
