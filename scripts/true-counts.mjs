// READ-ONLY. Earlier probes used .limit(50000) but Supabase caps a response at
// 1000 rows, so every "total" I derived from row counts was silently truncated.
// This uses head+exact counts, which are computed server-side and cannot truncate.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const env = {};
for (const l of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const count = async (table, build = (q) => q) => {
  const { count, error } = await build(db.from(table).select('*', { count: 'exact', head: true }));
  return error ? `err: ${error.message}` : count;
};

console.log('TRUE ROW COUNTS (server-side, not truncated)\n');
console.log('reports          :', await count('reports'));
console.log('  with a question:', await count('reports', q => q.not('personal_context','is',null).neq('personal_context','')));
console.log('  paid           :', await count('reports', q => q.eq('payment_status','paid')));
console.log('  free/preview   :', await count('reports', q => q.in('plan_type',['free','preview'])));
console.log('  complete       :', await count('reports', q => q.eq('status','complete')));
console.log('  errored        :', await count('reports', q => q.eq('status','error')));
console.log('ziina_payments   :', await count('ziina_payments'));
console.log('  completed      :', await count('ziina_payments', q => q.eq('status','completed')));
console.log('feedback         :', await count('feedback'));
console.log('analytics_events :', await count('analytics_events'));
console.log('newsletter_subs  :', await count('newsletter_subscribers'));
console.log('email_suppress.  :', await count('email_suppressions'));

// Distinct emails we could legitimately contact
const { data: emails } = await db.from('reports').select('user_email').limit(1000);
console.log('\n(sample of 1000 report rows → distinct emails:', new Set((emails??[]).map(r=>r.user_email?.toLowerCase()).filter(Boolean)).size, ')');

// Time span
const { data: oldest } = await db.from('reports').select('created_at').order('created_at',{ascending:true}).limit(1);
const { data: newest } = await db.from('reports').select('created_at').order('created_at',{ascending:false}).limit(1);
console.log('reports span     :', oldest?.[0]?.created_at?.slice(0,10), '→', newest?.[0]?.created_at?.slice(0,10));
const { data: ao } = await db.from('analytics_events').select('created_at').order('created_at',{ascending:true}).limit(1);
console.log('analytics span   :', ao?.[0]?.created_at?.slice(0,10), '→ now');
console.log('\nDONE');
