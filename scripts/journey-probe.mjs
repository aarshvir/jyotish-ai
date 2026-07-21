// READ-ONLY journey probe over analytics_events (event_name + properties JSON).
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = {};
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const days = Number(process.argv[2] ?? 14);
const since = new Date(Date.now() - days * 864e5).toISOString();

const { data, error } = await db.from('analytics_events')
  .select('user_id, event_name, properties, created_at')
  .gte('created_at', since).order('created_at', { ascending: true }).limit(50000);
if (error) { console.log('error:', error.message); process.exit(1); }
console.log(`events in ${days}d window: ${data.length}`);

const byEvent = {};
data.forEach((e) => { byEvent[e.event_name ?? '?'] = (byEvent[e.event_name ?? '?'] ?? 0) + 1; });
console.log('\nBY EVENT:');
Object.entries(byEvent).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${v}\t${k}`));

const path = (e) => (e.properties?.path ?? '').split('?')[0] || '?';
const byPath = {};
data.forEach((e) => { byPath[path(e)] = (byPath[path(e)] ?? 0) + 1; });
console.log('\nTOP 30 PATHS:');
Object.entries(byPath).sort((a, b) => b[1] - a[1]).slice(0, 30).forEach(([p, c]) => console.log(`  ${c}\t${p}`));

const bySrc = {};
data.forEach((e) => {
  const r = e.properties?.referrer;
  const u = e.properties?.utm?.source ?? e.properties?.utm_source;
  let s = u ?? 'direct';
  if (!u && r) { try { s = new URL(r).hostname; } catch { s = r.slice(0, 30); } }
  bySrc[s] = (bySrc[s] ?? 0) + 1;
});
console.log('\nSOURCES:', JSON.stringify(Object.fromEntries(Object.entries(bySrc).sort((a,b)=>b[1]-a[1]).slice(0,12))));

// Sessions
const sessions = {};
data.forEach((e) => {
  const sid = e.properties?.session_id ?? `u:${e.user_id ?? 'anon'}`;
  (sessions[sid] ??= []).push(e);
});
const sids = Object.values(sessions);
console.log(`\nSESSIONS: ${sids.length}`);

const has = (s, fn) => s.some(fn);
const sawPath = (frag) => (s) => has(s, (e) => path(e).includes(frag));
const sawEvent = (frag) => (s) => has(s, (e) => (e.event_name ?? '').includes(frag));
const funnel = {
  any_landing: sids.filter(sawPath('/')).length,
  blog: sids.filter(sawPath('/blog')).length,
  onboard: sids.filter(sawPath('onboard')).length,
  report_page: sids.filter(sawPath('/report/')).length,
  pricing: sids.filter(sawPath('pricing')).length,
  upsell: sids.filter(sawPath('upsell')).length,
  checkout_event: sids.filter(sawEvent('checkout')).length,
  payment_event: sids.filter(sawEvent('payment')).length,
  plan_click: sids.filter(sawEvent('plan')).length,
  cta_click: sids.filter(sawEvent('cta')).length,
};
console.log('SESSION FUNNEL:', JSON.stringify(funnel, null, 1));

// Durations
const durs = sids.map((s) => (new Date(s[s.length - 1].created_at) - new Date(s[0].created_at)) / 1000).filter((d) => d > 0).sort((a, b) => a - b);
if (durs.length) console.log(`\nSESSION SECONDS: n=${durs.length} median=${durs[Math.floor(durs.length/2)]|0} p75=${durs[Math.floor(durs.length*.75)]|0} p90=${durs[Math.floor(durs.length*.9)]|0} max=${durs[durs.length-1]|0}`);

// Where sessions END (last meaningful path)
const lastPath = {};
sids.forEach((s) => { const lp = path(s[s.length - 1]); lastPath[lp] = (lastPath[lp] ?? 0) + 1; });
console.log('\nEXIT PATHS (session last event):');
Object.entries(lastPath).sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([p, c]) => console.log(`  ${c}\t${p}`));

// Report-page sessions: what did they do AFTER the report?
const repSessions = sids.filter(sawPath('/report/'));
console.log(`\nREPORT-PAGE SESSIONS: ${repSessions.length}`);
let wentPricing = 0, wentOnboardAfter = 0, endedOnReport = 0, clickedAnything = 0;
repSessions.forEach((s) => {
  const idx = s.findIndex((e) => path(e).includes('/report/'));
  const after = s.slice(idx + 1);
  if (after.some((e) => path(e).includes('pricing'))) wentPricing++;
  if (after.some((e) => path(e).includes('onboard'))) wentOnboardAfter++;
  if (after.some((e) => (e.event_name ?? '') !== 'pageview' && (e.event_name ?? '') !== 'session_start')) clickedAnything++;
  if (path(s[s.length - 1]).includes('/report/')) endedOnReport++;
});
console.log(JSON.stringify({ wentPricing, wentOnboardAfter, clickedAnything, endedOnReport }, null, 1));

// Longest journeys
console.log('\nSAMPLE JOURNEYS (longest 10):');
sids.filter((s) => s.length > 3).sort((a, b) => b.length - a.length).slice(0, 10).forEach((s, i) => {
  const seq = s.map((e) => (e.event_name === 'pageview' || e.event_name === 'session_start' ? path(e) : `[${e.event_name}]`))
    .filter((v, idx, arr) => v !== arr[idx - 1]);
  const dur = ((new Date(s[s.length-1].created_at) - new Date(s[0].created_at)) / 1000) | 0;
  console.log(`  #${i + 1} ${s.length}ev ${dur}s: ${seq.slice(0, 16).join(' → ').slice(0, 260)}`);
});

// Non-pageview event details (clicks etc.)
const named = data.filter((e) => !['pageview', 'session_start'].includes(e.event_name ?? ''));
const nAgg = {};
named.forEach((e) => {
  const k = `${e.event_name}|${JSON.stringify(e.properties?.label ?? e.properties?.target ?? e.properties?.plan ?? e.properties?.cta ?? '').slice(0, 60)}`;
  nAgg[k] = (nAgg[k] ?? 0) + 1;
});
console.log('\nNAMED EVENTS DETAIL (top 25):');
Object.entries(nAgg).sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(([k, c]) => console.log(`  ${c}\t${k}`));
console.log('\nDONE');
