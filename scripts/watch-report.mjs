// Read-only: poll a report until it reaches a terminal status, printing progress.
// Usage: node scripts/watch-report.mjs <reportId>
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = {};
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const id = process.argv[2];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let lastLogLen = 0;
for (let i = 0; i < 20; i++) {
  const { data, error } = await db.from('reports')
    .select('status, generation_error_code, generation_error_at_phase, generation_trace_id, generation_log, updated_at')
    .eq('id', id).single();
  if (error) { console.log(`[poll ${i}] SELECT err: ${error.message}`); await sleep(60_000); continue; }

  const log = Array.isArray(data.generation_log) ? data.generation_log : [];
  const newEntries = log.slice(lastLogLen);
  lastLogLen = log.length;
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts} poll ${i}] status=${data.status} phase=${data.generation_error_at_phase ?? '-'} logLen=${log.length}`);
  for (const e of newEntries) {
    const lvl = e.level ?? '?';
    const msg = (e.message ?? e.event ?? '').toString().slice(0, 160);
    console.log(`     [${lvl}] ${msg}`);
  }

  if (data.status === 'complete' || data.status === 'error') {
    console.log(`\n=== TERMINAL: status=${data.status} err_code=${data.generation_error_code} at_phase=${data.generation_error_at_phase} trace=${data.generation_trace_id} ===`);
    process.exit(0);
  }
  await sleep(60_000);
}
console.log('\n=== still generating after 20 polls (~20 min) — likely stalled ===');
