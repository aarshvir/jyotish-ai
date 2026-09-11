// READ-ONLY. 1,416 reports but only 8 distinct emails in a 1,000-row sample.
// If that holds across the whole table, the "~1,000 users to email" I assumed
// does not exist. Paginates so nothing is truncated.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const env = {};
for (const l of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const rows = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await db.from('reports')
    .select('user_email, created_at, plan_type, status, personal_context')
    .order('created_at', { ascending: true }).range(from, from + 999);
  if (error) { console.log('err', error.message); break; }
  rows.push(...data);
  if (data.length < 1000) break;
}
console.log(`reports fetched: ${rows.length}`);

const byEmail = {};
rows.forEach(r => { const e = (r.user_email ?? '(none)').trim().toLowerCase(); (byEmail[e] ??= []).push(r); });
const entries = Object.entries(byEmail).sort((a,b)=>b[1].length-a[1].length);
console.log(`DISTINCT EMAILS: ${entries.length}\n`);

const mask = (e) => { const [u,d] = e.split('@'); return d ? `${u.slice(0,3)}***@${d}` : e; };
console.log('reports per account (top 20):');
entries.slice(0,20).forEach(([e,rs]) => {
  const q = rs.filter(r => (r.personal_context??'').trim().length>3).length;
  console.log(`  ${String(rs.length).padStart(5)}  ${mask(e).padEnd(34)} first=${rs[0].created_at.slice(0,10)} last=${rs[rs.length-1].created_at.slice(0,10)} questions=${q}`);
});

const oneOff = entries.filter(([,rs])=>rs.length===1).length;
console.log(`\naccounts with exactly 1 report: ${oneOff}`);
console.log(`accounts with >20 reports     : ${entries.filter(([,rs])=>rs.length>20).length}  <- almost certainly testing`);
const top = entries[0];
console.log(`top account holds ${top[1].length}/${rows.length} reports (${Math.round(top[1].length/rows.length*100)}%)`);

// Genuine outside users = accounts that are not the top testers
const realish = entries.filter(([,rs]) => rs.length <= 5);
console.log(`\naccounts with <=5 reports (plausibly real users): ${realish.length}`);
console.log('DONE');
