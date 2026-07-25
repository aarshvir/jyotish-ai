// Read-only: inspect a report's current state + tail of its generation log.
// Usage: node scripts/inspect-report.mjs <reportId>
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = {};
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const id = process.argv[2];

const { data, error } = await db.from('reports').select('*').eq('id', id).single();
if (error) { console.error('SELECT failed:', error.message); process.exit(1); }

console.log('STATE:', JSON.stringify({
  status: data.status,
  plan_type: data.plan_type,
  payment_status: data.payment_status,
  generation_trace_id: data.generation_trace_id,
  generation_error_code: data.generation_error_code,
  generation_error_at_phase: data.generation_error_at_phase,
  generation_started_at: data.generation_started_at,
  generation_completed_at: data.generation_completed_at,
  updated_at: data.updated_at,
  has_report_data: data.report_data != null,
  report_data_keys: data.report_data && typeof data.report_data === 'object' ? Object.keys(data.report_data) : null,
  has_pipeline_state: data.pipeline_state != null,
  day_scores_count: data.day_scores && typeof data.day_scores === 'object' ? Object.keys(data.day_scores).length : 0,
}, null, 2));

// generation_log may be a JSON array column; show the tail.
const log = data.generation_log;
if (Array.isArray(log)) {
  console.log(`\nGENERATION_LOG (${log.length} entries, last 18):`);
  for (const e of log.slice(-18)) {
    const lvl = e.level ?? e.type ?? '?';
    const msg = (e.message ?? e.event ?? JSON.stringify(e)).toString().slice(0, 200);
    console.log(`  [${lvl}] ${msg}`);
  }
} else if (log) {
  console.log('\nGENERATION_LOG (non-array):', JSON.stringify(log).slice(0, 800));
} else {
  console.log('\nGENERATION_LOG: (empty)');
}
