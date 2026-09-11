// READ-ONLY. Where is the traffic actually coming from? The calculator probe
// showed utm_source=chatgpt.com on several events, which would mean AI search is
// a real acquisition channel — that changes what we should build next.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const env = {};
for (const l of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data, error } = await db.from('analytics_events')
  .select('event_name, properties, created_at').order('created_at', { ascending: false }).limit(50000);
if (error) { console.log('err', error.message); process.exit(1); }
console.log(`total events stored: ${data.length}`);
console.log(`range: ${data[data.length-1]?.created_at?.slice(0,10)} → ${data[0]?.created_at?.slice(0,10)}`);

const host = (u) => { try { return new URL(u).hostname.replace(/^www\./,''); } catch { return null; } };

const ref = {}, utm = {}, firstTouch = {};
const sess = {};
for (const e of data) {
  const s = e.properties?.session_id; if (s) (sess[s] ??= []).push(e);
  const r = host(e.properties?.referrer ?? '');
  if (r) ref[r] = (ref[r] ?? 0) + 1;
  const u = e.properties?.utm?.utm_source;
  if (u) utm[u] = (utm[u] ?? 0) + 1;
}
// First referrer per session = acquisition source
for (const [, evs] of Object.entries(sess)) {
  const ordered = [...evs].reverse();
  const hit = ordered.find(e => host(e.properties?.referrer ?? '') || e.properties?.utm?.utm_source);
  const src = hit ? (hit.properties?.utm?.utm_source ?? host(hit.properties?.referrer)) : '(direct / none)';
  firstTouch[src] = (firstTouch[src] ?? 0) + 1;
}

const show = (t, o) => { console.log(`\n${t}`); Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,15).forEach(([k,v])=>console.log(`  ${String(v).padStart(5)}  ${k}`)); };
show('REFERRER HOSTS (all events)', ref);
show('UTM SOURCES', utm);
show('ACQUISITION SOURCE per session (first touch)', firstTouch);
console.log(`\nsessions: ${Object.keys(sess).length}`);
console.log('DONE');
