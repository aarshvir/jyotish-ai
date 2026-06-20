// One-off: reset a stuck/failed report so a clean "Try again" can run.
// Usage: node scripts/reset-stuck-report.mjs <reportId>
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load .env.local
const env = {};
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Missing Supabase URL or service role key'); process.exit(1); }

const reportId = process.argv[2];
if (!reportId) { console.error('Usage: node scripts/reset-stuck-report.mjs <reportId>'); process.exit(1); }

const db = createClient(url, key, { auth: { persistSession: false } });

// 1) Inspect current state
const { data: before, error: selErr } = await db
  .from('reports')
  .select('*')
  .eq('id', reportId)
  .single();
if (selErr) { console.error('SELECT failed:', selErr.message); process.exit(1); }

console.log('BEFORE:', {
  status: before.status,
  plan_type: before.plan_type ?? before.plan_id ?? before.plan ?? '(unknown)',
  payment_status: before.payment_status,
  err_code: before.generation_error_code,
  err_phase: before.generation_error_at_phase,
  has_pipeline_state: before.pipeline_state != null,
  has_report_data: before.report_data != null,
  has_day_scores: before.day_scores != null,
});

// 2) Reset to a clean failed state so "Try again" (forceRestart) runs from scratch.
const patch = {
  status: 'error', // matches markReportAsFailed() terminal status → shows "Try again"
  pipeline_state: null,
  generation_error_code: null,
  generation_error_at_phase: null,
  updated_at: new Date().toISOString(),
};
const { error: upErr } = await db.from('reports').update(patch).eq('id', reportId);
if (upErr) {
  // Retry without optional RCA columns if they don't exist in this DB.
  if (/generation_error_code|generation_error_at_phase|does not exist|schema cache/i.test(upErr.message)) {
    const { generation_error_code: _c, generation_error_at_phase: _p, ...essential } = patch;
    const { error: upErr2 } = await db.from('reports').update(essential).eq('id', reportId);
    if (upErr2) { console.error('UPDATE failed:', upErr2.message); process.exit(1); }
    console.log('(reset without RCA columns)');
  } else {
    console.error('UPDATE failed:', upErr.message); process.exit(1);
  }
}

const { data: after } = await db
  .from('reports')
  .select('status, pipeline_state, generation_error_code')
  .eq('id', reportId)
  .single();
console.log('AFTER:', { status: after.status, has_pipeline_state: after.pipeline_state != null, err_code: after.generation_error_code });
console.log('✅ Report reset. The user can now click "Try again" for a clean run.');
