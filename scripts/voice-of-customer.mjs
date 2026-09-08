// READ-ONLY: everything users have told us, in their own words, plus the
// behavioural patterns around it. Basis for product decisions — no writes.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = {};
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const S = (t) => console.log(`\n${'='.repeat(70)}\n${t}\n${'='.repeat(70)}`);

// ── 1. Explicit feedback ────────────────────────────────────────────────────
S('EXPLICIT FEEDBACK (every row, all time)');
{
  const { data, error } = await db.from('feedback').select('*').order('created_at', { ascending: false }).limit(500);
  if (error) console.log('err:', error.message);
  else {
    console.log(`rows: ${data.length}`);
    const ratings = data.map((f) => f.rating).filter((n) => typeof n === 'number');
    if (ratings.length) {
      const avg = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2);
      const dist = {}; ratings.forEach((r) => dist[r] = (dist[r] ?? 0) + 1);
      console.log(`avg rating: ${avg}/5 over ${ratings.length}  dist=${JSON.stringify(dist)}`);
    }
    data.forEach((f) => {
      const bits = [f.created_at?.slice(0, 10), f.rating != null ? `${f.rating}*` : '', (f.path ?? '').slice(0, 28)];
      console.log(`\n- ${bits.filter(Boolean).join(' | ')}`);
      if (f.brought_by?.trim()) console.log(`  came for : ${f.brought_by.trim().slice(0, 220)}`);
      if (f.message?.trim())    console.log(`  said     : ${f.message.trim().replace(/\s+/g, ' ').slice(0, 400)}`);
      if (f.email?.trim())      console.log(`  email    : yes (reachable)`);
    });
  }
}

// ── 2. What people actually asked the product ───────────────────────────────
S('WHAT USERS ASKED FOR (personal_context — their own words)');
{
  const { data, error } = await db.from('reports')
    .select('created_at, plan_type, payment_status, status, personal_context, native_name, birth_date, birth_time, birth_city, current_city')
    .order('created_at', { ascending: false }).limit(1000);
  if (error) { console.log('err:', error.message); }
  else {
    const withQ = data.filter((r) => (r.personal_context ?? '').trim().length > 3);
    console.log(`reports: ${data.length} | with a typed question: ${withQ.length} (${Math.round(withQ.length / Math.max(data.length,1) * 100)}%)`);

    // Theme tagging from their language
    const THEMES = {
      'career/job':      /\b(career|job|profession|work|employment|govt|government|promotion|switch|interview|business growth)\b/i,
      'money/wealth':    /\b(money|wealth|financ|salary|income|rich|earn|trading|stock|debt|loan|property)\b/i,
      'marriage/love':   /\b(marriage|marry|marraige|love|relationship|partner|spouse|husband|wife|divorce|breakup|match)\b/i,
      'children':        /\b(child|children|baby|conceive|conceiving|pregnan|son|daughter|fertil)\b/i,
      'health':          /\b(health|illness|disease|surgery|mental|anxiety|depress|energy)\b/i,
      'education':       /\b(stud(y|ies)|exam|education|college|admission|abroad|visa)\b/i,
      'business':        /\b(business|startup|company|venture|shop|entrepreneur)\b/i,
      'remedy/dosha':    /\b(dosha|manglik|remedy|stone|gem|puja|kaal sarp|sade sati|shani)\b/i,
      'timing/when':     /\b(when|timing|muhurat|date|which month|which day|how long)\b/i,
    };
    const counts = {}; const examples = {};
    for (const q of withQ.map((r) => r.personal_context.trim())) {
      for (const [t, re] of Object.entries(THEMES)) {
        if (re.test(q)) { counts[t] = (counts[t] ?? 0) + 1; (examples[t] ??= []).push(q); }
      }
    }
    console.log('\nTHEMES (a question can hit several):');
    Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([t, c]) => {
      const pct = Math.round(c / withQ.length * 100);
      console.log(`  ${String(c).padStart(3)}  ${String(pct).padStart(3)}%  ${t}`);
    });
    console.log('\nEVERY QUESTION VERBATIM:');
    withQ.forEach((r, i) => console.log(`  ${String(i + 1).padStart(3)}. [${r.plan_type}/${r.payment_status}] ${r.personal_context.trim().replace(/\s+/g, ' ').slice(0, 260)}`));

    // Data-quality signals that affect accuracy
    S('DATA QUALITY OF WHAT THEY GAVE US');
    const noTime = data.filter((r) => !r.birth_time || r.birth_time === '12:00:00').length;
    const noCity = data.filter((r) => !(r.birth_city ?? '').trim()).length;
    const noCurrent = data.filter((r) => !(r.current_city ?? '').trim()).length;
    console.log(`missing/noon birth time : ${noTime}/${data.length}  <- these charts are unreliable`);
    console.log(`missing birth city      : ${noCity}/${data.length}`);
    console.log(`missing current city    : ${noCurrent}/${data.length}  <- daily timing needs this`);

    S('FUNNEL / MONETISATION');
    const agg = {};
    data.forEach((r) => { const k = `${r.plan_type}|${r.payment_status}|${r.status}`; agg[k] = (agg[k] ?? 0) + 1; });
    Object.entries(agg).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${String(v).padStart(4)}  ${k}`));
    const byDay = {};
    data.forEach((r) => { const d = r.created_at.slice(0, 10); byDay[d] = (byDay[d] ?? 0) + 1; });
    const days = Object.entries(byDay).sort().slice(-14);
    console.log('\nreports/day (last 14 active days):', JSON.stringify(Object.fromEntries(days)));
  }
}

// ── 3. Money ────────────────────────────────────────────────────────────────
S('PAYMENTS (all time)');
{
  const { data, error } = await db.from('ziina_payments').select('status, plan_type, amount, currency, created_at').order('created_at', { ascending: false }).limit(500);
  if (error) console.log('err:', error.message);
  else {
    console.log(`payment intents ever: ${data.length}`);
    const agg = {}; data.forEach((p) => { const k = `${p.status}|${p.plan_type ?? '?'}`; agg[k] = (agg[k] ?? 0) + 1; });
    Object.entries(agg).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
    data.slice(0, 10).forEach((p) => console.log(`  ${p.created_at.slice(0,16)} ${p.status} ${p.plan_type} ${p.amount} ${p.currency}`));
  }
}

// ── 4. Where they came from / where they died ───────────────────────────────
S('TRAFFIC + DROP-OFF (last 30d)');
{
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const { data, error } = await db.from('analytics_events')
    .select('event_name, properties, created_at').gte('created_at', since)
    .order('created_at', { ascending: true }).limit(50000);
  if (error) { console.log('err:', error.message); }
  else {
    console.log(`events: ${data.length}`);
    const path = (e) => (e.properties?.path ?? '').split('?')[0] || '?';
    const byPath = {}; data.forEach((e) => byPath[path(e)] = (byPath[path(e)] ?? 0) + 1);
    console.log('\ntop entry/most-viewed paths:');
    Object.entries(byPath).sort((a,b)=>b[1]-a[1]).slice(0, 15).forEach(([p, c]) => console.log(`  ${String(c).padStart(5)}  ${p}`));

    const sess = {};
    data.forEach((e) => { const s = e.properties?.session_id ?? 'x'; (sess[s] ??= []).push(e); });
    const list = Object.values(sess);
    const saw = (frag) => list.filter((s) => s.some((e) => path(e).includes(frag))).length;
    console.log(`\nsessions: ${list.length}`);
    console.log(`  reached /onboard : ${saw('onboard')}`);
    console.log(`  reached /report  : ${saw('/report')}`);
    console.log(`  reached /pricing : ${saw('pricing')}`);
    const exits = {};
    list.forEach((s) => { const p = path(s[s.length - 1]); exits[p] = (exits[p] ?? 0) + 1; });
    console.log('\nwhere sessions END:');
    Object.entries(exits).sort((a,b)=>b[1]-a[1]).slice(0, 12).forEach(([p, c]) => console.log(`  ${String(c).padStart(4)}  ${p}`));
  }
}
console.log('\nDONE');
