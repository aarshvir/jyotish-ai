// READ-ONLY. /lagna-calculator is the most-viewed page on the site (239 views in
// 30d) and the single biggest exit (56 of 203 sessions end there). The CTAs only
// render after a successful calculation, so the question is where people stop:
// before calculating, or after seeing their result.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const env = {};
for (const l of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const since = new Date(Date.now() - 60 * 864e5).toISOString();
const { data, error } = await db.from('analytics_events')
  .select('event_name, properties, created_at').gte('created_at', since)
  .order('created_at', { ascending: true }).limit(50000);
if (error) { console.log('err', error.message); process.exit(1); }

const path = (e) => (e.properties?.path ?? '').split('?')[0] || '?';
console.log(`events (60d): ${data.length}`);

console.log('\nEVENT NAMES seen:');
const names = {}; data.forEach(e => names[e.event_name] = (names[e.event_name] ?? 0) + 1);
Object.entries(names).sort((a,b)=>b[1]-a[1]).slice(0,25).forEach(([n,c])=>console.log(`  ${String(c).padStart(5)}  ${n}`));

// Sessions that touched any calculator tool
const sess = {};
data.forEach(e => { const s = e.properties?.session_id ?? 'x'; (sess[s] ??= []).push(e); });
const TOOLS = ['/lagna-calculator','/kundali','/vimshottari-dasha-calculator','/nakshatra-calculator','/moon-sign-calculator'];
for (const tool of TOOLS) {
  const touched = Object.values(sess).filter(s => s.some(e => path(e) === tool));
  if (!touched.length) continue;
  const calculated = touched.filter(s => s.some(e => /calc|result|chart_computed/i.test(e.event_name)));
  const wentOn = touched.filter(s => s.some(e => /onboard|pricing|checkout/i.test(path(e)) || /checkout_started/i.test(e.event_name)));
  const endedHere = touched.filter(s => path(s[s.length-1]) === tool);
  console.log(`\n${tool}`);
  console.log(`  sessions touching : ${touched.length}`);
  console.log(`  ...that calculated: ${calculated.length}`);
  console.log(`  ...that moved on  : ${wentOn.length}`);
  console.log(`  ...that DIED here : ${endedHere.length}  (${Math.round(endedHere.length/touched.length*100)}%)`);
}

// Did anyone ever click the unlock CTA?
console.log('\nCTA / unlock signals:');
const cta = data.filter(e => /unlock|cta|share/i.test(e.event_name) || /unlock/i.test(JSON.stringify(e.properties ?? {})));
console.log(`  matching events: ${cta.length}`);
cta.slice(0,10).forEach(e=>console.log(`   ${e.created_at.slice(0,16)} ${e.event_name} ${JSON.stringify(e.properties).slice(0,120)}`));
console.log('\nDONE');
