// READ-ONLY. Same data, with the owner's own testing and the e2e fixtures removed.
// admin@vedichour.com alone holds 82% of all report rows; leaving it in makes every
// ratio meaningless (it is what produced the earlier "only 5% ask a question").
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
    .select('user_email, created_at, plan_type, status, personal_context, birth_time, current_city')
    .order('created_at', { ascending: true }).range(from, from + 999);
  if (error) { console.log('err', error.message); break; }
  rows.push(...data); if (data.length < 1000) break;
}

const isTest = (e) => { const x = (e ?? '').toLowerCase();
  return x.endsWith('@vedichour.com') || x.includes('e2e') || x.includes('@example.com') || x.startsWith('aarshvir@'); };
const real = rows.filter(r => !isTest(r.user_email));
const emails = new Set(real.map(r => (r.user_email??'').toLowerCase()).filter(Boolean));

console.log('=== REAL USERS ONLY (owner + e2e fixtures excluded) ===\n');
console.log(`real reports        : ${real.length}   (of ${rows.length} total rows)`);
console.log(`real distinct people: ${emails.size}`);
const withQ = real.filter(r => (r.personal_context ?? '').trim().length > 3);
console.log(`reports w/ a question: ${withQ.length}  (${Math.round(withQ.length/real.length*100)}% of real reports)`);
const qPeople = new Set(withQ.map(r => (r.user_email??'').toLowerCase()));
console.log(`PEOPLE who asked     : ${qPeople.size}  (${Math.round(qPeople.size/emails.size*100)}% of real users)  <- the personalisation hook`);

const perPerson = {};
real.forEach(r => { const e=(r.user_email??'').toLowerCase(); perPerson[e]=(perPerson[e]??0)+1; });
const repeat = Object.values(perPerson).filter(n=>n>1).length;
console.log(`\nreturned for a 2nd report: ${repeat}/${emails.size} people (${Math.round(repeat/emails.size*100)}%)`);

const byMonth = {};
real.forEach(r => { const m=r.created_at.slice(0,7); byMonth[m]=(byMonth[m]??new Set()); byMonth[m].add((r.user_email??'').toLowerCase()); });
console.log('\nNEW-ish activity — distinct real people per month:');
Object.entries(byMonth).sort().forEach(([m,s])=>console.log(`  ${m}: ${s.size}`));

console.log('\ndata quality among real users:');
console.log(`  missing/noon birth time: ${real.filter(r=>!r.birth_time||r.birth_time==='12:00:00').length}/${real.length}`);
console.log(`  missing current city   : ${real.filter(r=>!(r.current_city??'').trim()).length}/${real.length}`);
const done = real.filter(r=>r.status==='complete').length;
console.log(`  completed successfully : ${done}/${real.length} (${Math.round(done/real.length*100)}%)`);
console.log(`  errored                : ${real.filter(r=>r.status==='error').length}`);
console.log('\nDONE');
