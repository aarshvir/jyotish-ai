// READ-ONLY prod funnel probe: where do visitors go, where do they drop, what do
// they say, and did ANYONE reach payment? No writes anywhere.
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
const section = (t) => console.log(`\n=== ${t} ===`);

// ---- 1. Signups ----
section(`SIGNUPS (last ${days}d)`);
try {
  let users = [], page = 1;
  for (;;) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) { console.log('listUsers error:', error.message); break; }
    users = users.concat(data.users ?? []);
    if (!data.users || data.users.length < 1000) break;
    page++;
  }
  const recent = users.filter((u) => u.created_at >= since);
  console.log(`total users: ${users.length}; new in window: ${recent.length}`);
  const byDay = {};
  recent.forEach((u) => { const d = u.created_at.slice(0, 10); byDay[d] = (byDay[d] ?? 0) + 1; });
  console.log('by day:', JSON.stringify(byDay));
  const providers = {};
  recent.forEach((u) => { const p = u.app_metadata?.provider ?? '?'; providers[p] = (providers[p] ?? 0) + 1; });
  console.log('providers:', JSON.stringify(providers));
} catch (e) { console.log('signups failed:', e.message); }

// ---- 2. Reports funnel ----
section('REPORTS');
{
  const { data, error } = await db.from('reports')
    .select('id, plan_type, status, payment_status, created_at, personal_context, generation_error_code, generation_error_at_phase, user_email')
    .gte('created_at', since).order('created_at', { ascending: false }).limit(2000);
  if (error) console.log('error:', error.message);
  else {
    console.log(`reports in window: ${data.length}`);
    const agg = {};
    data.forEach((r) => { const k = `${r.plan_type}|${r.status}|${r.payment_status}`; agg[k] = (agg[k] ?? 0) + 1; });
    console.log('plan|status|payment counts:');
    Object.entries(agg).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
    const errs = data.filter((r) => r.status === 'error');
    console.log(`errored: ${errs.length}`);
    errs.slice(0, 10).forEach((r) => console.log(`  ${r.created_at.slice(0,16)} ${r.plan_type} code=${r.generation_error_code} phase=${r.generation_error_at_phase}`));
    const qs = data.map((r) => (r.personal_context ?? '').trim()).filter((q) => q.length > 3);
    console.log(`\nQUESTIONS PEOPLE TYPED (${qs.length} of ${data.length} reports had one):`);
    qs.slice(0, 40).forEach((q) => console.log(`  • ${q.replace(/\s+/g, ' ').slice(0, 160)}`));
  }
}

// ---- 3. Payments: did ANYONE start checkout? ----
section('ZIINA PAYMENTS (all time + window)');
{
  const { data, error } = await db.from('ziina_payments')
    .select('status, plan_type, amount, currency, created_at, report_id')
    .order('created_at', { ascending: false }).limit(500);
  if (error) console.log('error:', error.message);
  else {
    console.log(`total payment intents ever: ${data.length}`);
    const agg = {};
    data.forEach((p) => { const k = `${p.status}|${p.plan_type ?? '?'}`; agg[k] = (agg[k] ?? 0) + 1; });
    Object.entries(agg).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
    const recent = data.filter((p) => p.created_at >= since);
    console.log(`in window: ${recent.length}`);
    recent.slice(0, 15).forEach((p) => console.log(`  ${p.created_at.slice(0,16)} ${p.status} ${p.plan_type} ${p.amount} ${p.currency}`));
  }
}

// ---- 4. Analytics events: pages, journeys, drop-offs ----
section('ANALYTICS EVENTS');
{
  const { data, error } = await db.from('analytics_events')
    .select('event, path, session_id, created_at, meta, referrer, utm_source, utm_medium, utm_campaign')
    .gte('created_at', since).order('created_at', { ascending: true }).limit(20000);
  if (error) { console.log('error:', error.message); }
  else {
    console.log(`events in window: ${data.length}`);
    const byEvent = {};
    data.forEach((e) => { byEvent[e.event ?? '?'] = (byEvent[e.event ?? '?'] ?? 0) + 1; });
    console.log('by event type:', JSON.stringify(byEvent, null, 1).slice(0, 1200));
    const byPath = {};
    data.forEach((e) => { const p = (e.path ?? '?').split('?')[0]; byPath[p] = (byPath[p] ?? 0) + 1; });
    console.log('\ntop 25 paths:');
    Object.entries(byPath).sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(([p, c]) => console.log(`  ${c}  ${p}`));
    const bySrc = {};
    data.forEach((e) => { const s = e.utm_source ?? (e.referrer ? new URL(e.referrer, 'https://x.x').hostname : 'direct'); bySrc[s] = (bySrc[s] ?? 0) + 1; });
    console.log('\nsources:', JSON.stringify(bySrc).slice(0, 600));

    // Session journeys
    const sessions = {};
    data.forEach((e) => {
      const sid = e.session_id ?? 'nosid';
      (sessions[sid] ??= []).push(e);
    });
    const sids = Object.values(sessions);
    console.log(`\nsessions: ${sids.length}`);
    // Funnel: saw landing → onboard → report page → pricing/checkout-ish
    const seen = (evs, frag) => evs.some((e) => (e.path ?? '').includes(frag) || (e.event ?? '').includes(frag));
    const funnel = {
      landing: sids.filter((s) => seen(s, '/') ).length,
      onboard: sids.filter((s) => seen(s, 'onboard')).length,
      report: sids.filter((s) => seen(s, '/report')).length,
      pricing: sids.filter((s) => seen(s, 'pricing')).length,
      checkoutish: sids.filter((s) => seen(s, 'checkout') || seen(s, 'payment') || seen(s, 'ziina') || seen(s, 'intent')).length,
    };
    console.log('session funnel:', JSON.stringify(funnel));
    // Session durations
    const durs = sids.map((s) => (new Date(s[s.length-1].created_at) - new Date(s[0].created_at)) / 1000).filter((d) => d > 0).sort((a,b)=>a-b);
    if (durs.length) console.log(`session duration s: median=${durs[Math.floor(durs.length/2)]|0} p75=${durs[Math.floor(durs.length*0.75)]|0} p90=${durs[Math.floor(durs.length*0.9)]|0}`);
    // Sample 8 longest journeys (path sequences)
    const ranked = sids.filter((s)=>s.length>2).sort((a, b) => b.length - a.length).slice(0, 8);
    console.log('\nsample journeys (longest):');
    ranked.forEach((s, i) => {
      const seq = s.map((e) => (e.event === 'pageview' || !e.event ? (e.path ?? '?').split('?')[0] : `[${e.event}]`)).filter((v, idx, arr) => v !== arr[idx-1]);
      console.log(`  #${i+1} (${s.length} ev): ${seq.slice(0, 14).join(' → ').slice(0, 240)}`);
    });
    // CLICK events detail (first-party click tracking)
    const clicks = data.filter((e) => (e.event ?? '').toLowerCase().includes('click'));
    const clickAgg = {};
    clicks.forEach((e) => { const k = JSON.stringify(e.meta ?? {}).slice(0, 80); clickAgg[k] = (clickAgg[k] ?? 0) + 1; });
    console.log('\ntop clicks:');
    Object.entries(clickAgg).sort((a,b)=>b[1]-a[1]).slice(0, 15).forEach(([k, c]) => console.log(`  ${c}  ${k}`));
  }
}

// ---- 5. Feedback comments ----
section('FEEDBACK (all)');
{
  const { data, error } = await db.from('feedback').select('*').order('created_at', { ascending: false }).limit(200);
  if (error) console.log('error:', error.message);
  else {
    console.log(`feedback rows: ${data.length}`);
    data.forEach((f) => {
      const parts = [f.created_at?.slice(0, 16), f.rating != null ? `★${f.rating}` : '', (f.brought_by ?? '').slice(0, 60), '|', (f.message ?? '').replace(/\s+/g, ' ').slice(0, 200)];
      console.log('  ' + parts.filter(Boolean).join(' '));
    });
  }
}

// ---- 6. Day ratings (resonance) ----
section('DAY RATINGS (resonance loop)');
{
  const { data, error } = await db.from('day_ratings').select('*').limit(100);
  if (error) console.log('table/err:', error.message);
  else console.log(`rows: ${data.length}`, data.slice(0, 10));
}

// ---- 7. Promo redemptions ----
section('PROMO REDEMPTIONS');
{
  const { data, error } = await db.from('promo_redemptions').select('created_at, code_id').order('created_at', { ascending: false }).limit(50);
  if (error) console.log('err:', error.message);
  else console.log(`rows: ${data.length}`, (data ?? []).slice(0, 8).map((r) => r.created_at?.slice(0, 16)));
}
console.log('\nDONE');
