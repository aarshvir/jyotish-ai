/**
 * Measures what one 30-day subscription forecast costs in model spend, call by call, for an INVENTED
 * person, and shows what the quiz answers do to the written text.
 *
 *   1. Start the ephemeris:    cd ephemeris-service && python -m uvicorn main:app --port 8000
 *   2. Start Next with a LOCAL secret and no database (nothing here writes anywhere):
 *        BYPASS_SECRET=probe-local NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:1 NEXT_PUBLIC_SUPABASE_ANON_KEY=x \
 *        EPHEMERIS_SERVICE_URL=http://127.0.0.1:8000 ANTHROPIC_API_KEY=... npx next dev -p 3217 > next.log 2>&1
 *   3. npx tsx scripts/report-cost-probe.ts --who asha --log next.log [--routes daily,hourly,months,weeks,nativity]
 *                                          [--hourly-model claude-haiku-5-5] [--hourly-days 2] [--out dir]
 *
 * It calls the real commentary routes with payloads built the way the orchestrator builds them, then
 * reads the `llm_usage` lines each call left in the server log and prices them with src/lib/llm/cost.ts.
 * Daily overviews, months, weeks and nativity are measured in full; the hourly batch is measured on
 * --hourly-days days and scaled (it is linear in days).
 */
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const arg = (name: string, d?: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : d;
};

async function main() {
  const { costUsd } = await import('../src/lib/llm/cost');
  const fx = await import('../src/lib/personalization/fixtures');
  const { addDays } = await import('../src/lib/personalization/eventDate');
  const { resolveHourlyBatchDays } = await import('../src/lib/reports/hourlyProseWindow');

  const who = (arg('who', 'asha') ?? 'asha') as keyof typeof fx.START_FIXTURES;
  // --event "interview on 24 October" replaces the date the fixture person typed (so it falls inside the 30 days).
  const eventOverride = arg('event');
  const personal = eventOverride && who === 'asha'
    ? (await import('../src/lib/quiz/personalContext')).personalContextFrom({ ...fx.ASHA_ANSWERS, event_what: eventOverride })
    : (fx.START_FIXTURES[who] ?? '');
  const port = arg('port', '3217');
  const base = `http://127.0.0.1:${port}`;
  const logFile = arg('log');
  const routes = (arg('routes', 'daily,hourly,months,weeks,nativity') ?? '').split(',');
  const hourlyModel = arg('hourly-model');
  const hourlyDays = Number(arg('hourly-days', '2'));
  const hourlyAt = Number(arg('hourly-at', '0'));
  const out = arg('out', resolve(process.cwd(), 'tmp')) as string;
  mkdirSync(out, { recursive: true });
  const headers = { 'content-type': 'application/json', 'x-bypass-token': process.env.PROBE_SECRET ?? 'probe-local' };

  // ── real chart and 30 real days from the local engine ──
  const eph = process.env.EPHEMERIS_SERVICE_URL ?? 'http://127.0.0.1:8000';
  const b = fx.SAME_CHART_BIRTH;
  const chart = await (await fetch(`${eph}/natal-chart`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ birth_date: b.date, birth_time: `${b.time}:00`, birth_city: b.city, birth_lat: b.lat, birth_lng: b.lng }) })).json();
  const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const dates = Array.from({ length: 30 }, (_, i) => addDays(fx.FIXTURE_TODAY, i));
  const grid = await (await fetch(`${eph}/generate-daily-grid-batch`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ dates, current_lat: b.lat, current_lng: b.lng, natal_lagna_sign_index: SIGNS.indexOf(chart.lagna) }) })).json();
  const days = grid.days as Record<string, any>[];
  const md = chart.current_dasha.mahadasha as string;
  const ad = chart.current_dasha.antardasha as string;

  // ── log reader ──
  let offset = logFile ? statSync(logFile).size : 0;
  const usageSince = () => {
    if (!logFile) return [] as { stage: string; model: string; input: number; output: number; wasted: boolean }[];
    const text = readFileSync(logFile, 'utf8');
    const fresh = text.slice(offset);
    offset = text.length;
    const rows: { stage: string; model: string; input: number; output: number; wasted: boolean }[] = [];
    for (const line of fresh.split(/\r?\n/)) {
      const i = line.indexOf('{"type":"llm_usage"');
      if (i < 0) continue;
      try {
        const j = JSON.parse(line.slice(i)) as { stage: string; model: string; input: number | null; output: number | null; wasted?: boolean };
        rows.push({ stage: j.stage, model: j.model, input: j.input ?? 0, output: j.output ?? 0, wasted: Boolean(j.wasted) });
      } catch {
        /* a partial line */
      }
    }
    return rows;
  };

  const results: Record<string, unknown>[] = [];
  const run = async (name: string, path: string, body: unknown) => {
    usageSince();
    const t0 = Date.now();
    const res = await fetch(`${base}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
    const json = (await res.json().catch(() => ({}))) as Record<string, any>;
    await new Promise((r) => setTimeout(r, 600));
    const rows = usageSince();
    const cost = rows.map((r) => costUsd(r.model, r.input, r.output));
    const row = {
      route: name,
      http: res.status,
      seconds: Math.round((Date.now() - t0) / 1000),
      calls: rows.filter((r) => !r.wasted).length,
      wastedCalls: rows.filter((r) => r.wasted).length,
      wastedUsd: Number(rows.filter((r) => r.wasted).reduce((a, r) => a + (costUsd(r.model, r.input, r.output) ?? 0), 0).toFixed(4)),
      models: Array.from(new Set(rows.map((r) => r.model))),
      input: rows.reduce((a, r) => a + r.input, 0),
      output: rows.reduce((a, r) => a + r.output, 0),
      costUsd: cost.every((c) => c !== null) ? Number(cost.reduce((a, c) => a + (c ?? 0), 0).toFixed(4)) : null,
    };
    results.push(row);
    console.log(JSON.stringify(row));
    return json;
  };

  const personalContext = personal;
  const model = arg('model');
  const common = { lagnaSign: chart.lagna, mahadasha: md, antardasha: ad, personal_context: personalContext, require_scripture_grounding: false, ...(model ? { model_override: model } : {}) };
  const samples: Record<string, unknown> = {};

  if (routes.includes('nativity')) {
    samples.nativityAgent = await run('agents/nativity', '/api/agents/nativity', { natalChart: chart, ragTimeoutMs: 35000, requireScriptureGrounding: false });
    const j = await run('commentary/nativity-text', '/api/commentary/nativity-text', {
      ...common, lagnaDegreee: chart.lagna_degree, moonSign: chart.planets.Moon.sign, moonNakshatra: chart.planets.Moon.nakshatra,
      md_end: chart.dasha_sequence.find((d: any) => d.planet === md)?.end_date, ad_end: chart.current_dasha.end_date, planets: chart.planets,
    });
    samples.nativity = j;
  }
  if (routes.includes('daily')) {
    const dn = Number(arg('daily-days', '30'));
    const j = await run(`commentary/daily-overviews (${dn} days)`, '/api/commentary/daily-overviews', {
      ...common,
      days: days.slice(Number(arg('daily-at', '0')), Number(arg('daily-at', '0')) + dn).map((d) => ({
        date: d.date, panchang: d.panchang, planet_positions: d.planet_positions,
        slots: d.slots.map((s: any) => ({ display_label: s.display_label, score: s.score, dominant_choghadiya: s.dominant_choghadiya })),
        day_score: d.day_score, rahu_kaal: d.rahu_kaal,
        peak_slots: d.slots.filter((s: any) => s.score >= 75).slice(0, 3).map((s: any) => ({ display_label: s.display_label, dominant_hora: s.dominant_hora, dominant_choghadiya: s.dominant_choghadiya, score: s.score })),
      })),
    });
    samples.daily = j;
  }
  if (routes.includes('hourly')) {
    const n = Math.max(1, hourlyDays);
    const j = await run(`commentary/hourly-batch (${n} days${hourlyModel ? `, ${hourlyModel}` : ''})`, '/api/commentary/hourly-batch', {
      ...common,
      ...(hourlyModel ? { model_override: hourlyModel } : {}),
      days: days.slice(hourlyAt, hourlyAt + n).map((d, i) => ({
        dayIndex: i, date: d.date, planet_positions: d.planet_positions, panchang: d.panchang, rahu_kaal: d.rahu_kaal,
        slots: d.slots.map((s: any) => ({ slot_index: s.slot_index, display_label: s.display_label, dominant_hora: s.dominant_hora, dominant_choghadiya: s.dominant_choghadiya, transit_lagna: s.transit_lagna, transit_lagna_house: s.transit_lagna_house, is_rahu_kaal: s.is_rahu_kaal, score: s.score })),
      })),
    });
    samples.hourly = j;
  }
  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const allMonths = Array.from({ length: 12 }, (_, i) => {
    const [y, m] = fx.FIXTURE_TODAY.split('-').map(Number);
    const idx = (m - 1 + i) % 12;
    return { month_label: `${MONTH_NAMES[idx]} ${y + Math.floor((m - 1 + i) / 12)}`, month_index: i, key_transits_hint: '' };
  });
  const ref = { ...common, startMonth: fx.FIXTURE_TODAY.slice(0, 7), reference_planet_positions: days[0].planet_positions, reference_planet_positions_date: days[0].date, reference_panchang: days[0].panchang, reference_rahu_kaal: days[0].rahu_kaal, reference_slots: days[0].slots.map((s: any) => ({ display_label: s.display_label, score: s.score, dominant_choghadiya: s.dominant_choghadiya })) };
  if (routes.includes('months')) {
    samples.months1 = await run('commentary/months-first (months 1-6)', '/api/commentary/months-first', { ...ref, months: allMonths.slice(0, 6) });
    samples.months2 = await run('commentary/months-second (months 7-12)', '/api/commentary/months-second', { ...ref, months: allMonths.slice(6, 12) });
  }
  if (routes.includes('weeks')) {
    const weeks = Array.from({ length: Math.ceil(days.length / 7) }, (_, w) => {
      const slice = days.slice(w * 7, w * 7 + 7);
      return { week_label: `${slice[0].date}`, start_date: slice[0].date, end_date: slice[slice.length - 1].date, daily_scores: slice.map((d) => d.day_score) };
    });
    const sorted = [...days].sort((a, b) => b.day_score - a.day_score);
    samples.weeks = await run('commentary/weeks-synthesis', '/api/commentary/weeks-synthesis', {
      ...common, reportStartDate: days[0].date, weeks,
      planet_positions_by_date: days.map((d) => ({ date: d.date, planet_positions: d.planet_positions, panchang: d.panchang, rahu_kaal: d.rahu_kaal, slots: d.slots.map((s: any) => ({ display_label: s.display_label, score: s.score, dominant_choghadiya: s.dominant_choghadiya })) })),
      synthesis_context: { total_days: days.length, best_date: sorted[0].date, best_score: sorted[0].day_score, worst_date: sorted[sorted.length - 1].date, worst_score: sorted[sorted.length - 1].day_score, avg_score: Math.round(days.reduce((a, d) => a + d.day_score, 0) / days.length) },
    });
  }

  // ── totals, with the hourly batch scaled to 10 (default window) and 30 days ──
  const cost = (r: Record<string, any>) => (r.costUsd as number | null) ?? 0;
  const hourlyRow = results.find((r) => String(r.route).startsWith('commentary/hourly-batch')) as Record<string, any> | undefined;
  const perDay = hourlyRow ? cost(hourlyRow) / Math.max(1, hourlyDays) : 0;
  const fixed = results.filter((r) => r !== hourlyRow).reduce((a, r) => a + cost(r as Record<string, any>), 0);
  const summary = {
    who,
    hourlyBatchDays: resolveHourlyBatchDays(10),
    fixedPartsUsd: Number(fixed.toFixed(4)),
    hourlyPerDayUsd: Number(perDay.toFixed(4)),
    totalWith10ProseDaysUsd: Number((fixed + perDay * 10).toFixed(2)),
    totalWith30ProseDaysUsd: Number((fixed + perDay * 30).toFixed(2)),
    rows: results,
  };
  writeFileSync(resolve(out, `cost-probe-${who}.json`), JSON.stringify({ summary, samples }, null, 2));
  console.log(JSON.stringify({ ...summary, rows: undefined }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
