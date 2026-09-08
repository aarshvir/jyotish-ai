// READ-ONLY. The single most important question in the business right now:
// two payment intents exist, both stuck 'pending'. Did those buyers ABANDON at
// Ziina's page, or did they PAY and we failed to deliver? Asks Ziina directly.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = {};
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: rows, error } = await db.from('ziina_payments').select('*').order('created_at', { ascending: false });
if (error) { console.log('db err:', error.message); process.exit(1); }
console.log(`ziina_payments rows: ${rows.length}\n`);

const token = env.ZIINA_API_TOKEN;
console.log(`ZIINA_API_TOKEN present locally: ${token ? 'yes' : 'NO'}\n`);

for (const r of rows) {
  console.log('─'.repeat(66));
  console.log(`created   : ${r.created_at}`);
  console.log(`intent    : ${r.ziina_intent_id}`);
  console.log(`our status: ${r.status}   plan=${r.plan_type}  ${r.amount} ${r.currency}`);
  console.log(`report_id : ${r.report_id}`);
  console.log(`promo     : ${r.promo_code_id ?? 'none'}`);

  if (!token) continue;
  try {
    const res = await fetch(`https://api-v2.ziina.com/api/payment_intent/${r.ziina_intent_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json().catch(() => null);
    console.log(`ZIINA SAYS: http ${res.status} status=${body?.status ?? '?'} amount=${body?.amount ?? '?'} ${body?.currency_code ?? ''}`);
    if (body?.status && body.status !== 'pending') console.log(`  >>> MISMATCH: Ziina=${body.status}, our DB=${r.status}`);
    if (body?.created_at) console.log(`  ziina created_at: ${body.created_at}`);
  } catch (e) {
    console.log('ZIINA fetch failed:', e.message);
  }

  // Did the buyer end up with a report anyway?
  if (r.report_id) {
    const { data: rep } = await db.from('reports').select('status, payment_status, plan_type, user_email, created_at').eq('id', r.report_id).maybeSingle();
    console.log(`report    : ${rep ? `${rep.plan_type}/${rep.payment_status}/${rep.status}` : 'NO ROW'}`);
  }
}

// Is the webhook ever firing at all?
console.log('\n' + '='.repeat(66));
const { data: ev, error: evErr } = await db.from('subscription_events').select('provider, event_type, created_at').limit(5);
console.log('subscription_events table:', evErr ? `MISSING (${evErr.message})` : `${ev.length} rows`);
console.log('DONE');
