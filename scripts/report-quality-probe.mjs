// READ-ONLY: audit the CONTENT quality of real user reports.
// Hunts the owner-reported defects: uniform 65 scores, "keeps generating"
// synthesis, missing CTAs, empty insight sections.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = {};
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data, error } = await db.from('reports')
  .select('id, created_at, plan_type, status, payment_status, report_data')
  .eq('status', 'complete').order('created_at', { ascending: false }).limit(25);
if (error) { console.log('error:', error.message); process.exit(1); }
console.log(`Auditing ${data.length} completed reports\n`);

const uniq = (a) => Array.from(new Set(a));
let uniformScoreReports = 0, emptySynth = 0, genericSynth = 0, noMonths = 0, noWeeks = 0;
const synthSamples = [], overviewSamples = [];

for (const r of data) {
  const rd = r.report_data ?? {};
  const days = Array.isArray(rd.days) ? rd.days : [];
  const dayScores = days.map((d) => d?.day_score).filter((n) => typeof n === 'number');
  const slotScores = days.flatMap((d) => (d?.slots ?? []).map((s) => s?.score)).filter((n) => typeof n === 'number');
  const uDay = uniq(dayScores), uSlot = uniq(slotScores);
  const months = Array.isArray(rd.months) ? rd.months : [];
  const weeks = Array.isArray(rd.weeks) ? rd.weeks : [];

  const syn = rd.synthesis;
  const synText = typeof syn === 'string' ? syn
    : [syn?.opening_paragraph, syn?.closing_paragraph].filter(Boolean).join(' ');
  const flags = [];
  if (uDay.length === 1 && dayScores.length > 1) { flags.push(`ALL day_scores == ${uDay[0]}`); uniformScoreReports++; }
  if (uSlot.length <= 2 && slotScores.length > 10) flags.push(`slot scores only ${JSON.stringify(uSlot)}`);
  if (!synText || synText.trim().length < 40) { flags.push('synthesis EMPTY/stub'); emptySynth++; }
  if (/generat|unfold|being (created|prepared)|coming soon|in progress/i.test(synText)) { flags.push('synthesis says GENERATING'); genericSynth++; }
  if (months.length === 0) { flags.push('months EMPTY'); noMonths++; }
  if (weeks.length === 0) { flags.push('weeks EMPTY'); noWeeks++; }

  const dp = syn?.domain_priorities;
  if (!dp) flags.push('domain_priorities MISSING');
  const monthScores = months.map((m) => m?.score).filter((n) => typeof n === 'number');
  if (monthScores.length && uniq(monthScores).length === 1) flags.push(`ALL month scores == ${monthScores[0]}`);
  // domain score uniformity (the "65 65 65" complaint)
  const domVals = months.flatMap((m) => Object.values(m?.domain_scores ?? {})).filter((n) => typeof n === 'number');
  if (domVals.length && uniq(domVals).length <= 2) flags.push(`domain_scores nearly uniform ${JSON.stringify(uniq(domVals))}`);

  if (flags.length) {
    console.log(`${r.id.slice(0, 8)} ${r.created_at.slice(0, 10)} ${r.plan_type}/${r.payment_status}`);
    console.log(`   days=${days.length} months=${months.length} weeks=${weeks.length} dayScores=${JSON.stringify(uDay).slice(0, 60)}`);
    flags.forEach((f) => console.log(`   ⚠ ${f}`));
  }
  if (synText && synthSamples.length < 5) synthSamples.push(`${r.id.slice(0,8)}: ${synText.replace(/\s+/g, ' ').slice(0, 220)}`);
  const ov = days[0]?.overview;
  if (ov && overviewSamples.length < 5) overviewSamples.push(`${r.id.slice(0,8)}: ${String(ov).replace(/\s+/g, ' ').slice(0, 200)}`);
}

console.log(`\n=== TOTALS over ${data.length} reports ===`);
console.log({ uniformScoreReports, emptySynth, genericSynth, noMonths, noWeeks });
console.log('\n=== SYNTHESIS SAMPLES ===');
synthSamples.forEach((s) => console.log(' •', s));
console.log('\n=== DAY-OVERVIEW SAMPLES ===');
overviewSamples.forEach((s) => console.log(' •', s));

// Domain-score distribution across every month of every report
const allDom = {};
for (const r of data) {
  for (const m of (r.report_data?.months ?? [])) {
    for (const [k, v] of Object.entries(m?.domain_scores ?? {})) {
      if (typeof v === 'number') (allDom[k] ??= []).push(v);
    }
  }
}
console.log('\n=== DOMAIN SCORE DISTRIBUTION (all reports) ===');
for (const [k, arr] of Object.entries(allDom)) {
  const u = uniq(arr);
  console.log(`  ${k}: n=${arr.length} distinct=${u.length} values=${JSON.stringify(u.slice(0, 12))}`);
}
console.log('\nDONE');
