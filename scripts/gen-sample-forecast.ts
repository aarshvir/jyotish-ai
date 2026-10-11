/**
 * Builds the data behind /sample-report (src/components/landing/sampleForecast.ts) for the INVENTED
 * reader in src/components/landing/sampleReader.ts: the real engine's chart, dasha and 30 real days,
 * plus the real commentary routes' text for those days, written for that reader's quiz answers.
 *
 *   1. cd ephemeris-service && python -m uvicorn main:app --port 8000        (must report ayanamsa_ok and worker_thread_ok)
 *   2. BYPASS_SECRET=probe-local NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:1 NEXT_PUBLIC_SUPABASE_ANON_KEY=x \
 *      EPHEMERIS_SERVICE_URL=http://127.0.0.1:8000 ANTHROPIC_API_KEY=... npx next dev -p 3217 > next.log 2>&1
 *   3. npx tsx scripts/gen-sample-forecast.ts --log next.log --cache calls.json
 *
 * Nothing is written to a database (the dev server has a dummy address). The model calls cost about
 * $0.20 in all: nativity, three daily overviews, six months, the weeks and the synthesis, and one day of
 * hourly prose. Pass --engine-only to rebuild the engine half without spending anything (the written
 * half is then taken from the existing file).
 */
import { readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const arg = (name: string, d?: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : d;
};
const flag = (name: string) => process.argv.includes(`--${name}`);

const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

async function post(url: string, body: unknown, headers: Record<string, string> = {}): Promise<Json> {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
  const text = await res.text();
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text) as Json;
}

/**
 * A month's analysis arrives as "Opening: ... Key planetary movements: ... Week-by-week rhythm: ... Closing: ..."
 * (the labels' capitals vary) followed by "BEST: ... WORST: ... Rating: n/100". Returns the parts the sample shows.
 */
function splitMonth(analysis: string): { opening: string; movements: string; closing: string; best: string; worst: string } {
  const text = analysis.replace(/\r/g, '');
  const tail = (label: string) => (text.match(new RegExp('(?:^|\\n|\\s)' + label + ':\\s*([^\\n]+?)(?=\\s+(?:WORST|BEST|Rating):|\\s*$|\\n)'))?.[1] ?? '').trim();
  const best = tail('BEST');
  const worst = tail('WORST');
  const body = text.replace(/\n?\s*BEST:[\s\S]*$/, '').trim();
  const labelRe = /(?:^|\n)\s*(Opening|Key planetary movements|Week-by-week rhythm|Closing)\s*:\s*/gi;
  const marks: { name: string; at: number; end: number }[] = [];
  for (let m = labelRe.exec(body); m; m = labelRe.exec(body)) marks.push({ name: m[1].toLowerCase(), at: m.index, end: m.index + m[0].length });
  const part = (name: string) => {
    const i = marks.findIndex((x) => x.name === name);
    if (i < 0) return '';
    return body.slice(marks[i].end, i + 1 < marks.length ? marks[i + 1].at : body.length).trim();
  };
  const opening = part('opening') || (marks.length ? '' : body.split(/\n\s*\n/)[0].trim());
  const closing = part('closing');
  return { opening, movements: part('key planetary movements'), closing, best, worst };
}

async function main() {
  const { costUsd } = await import('../src/lib/llm/cost');
  const sr = await import('../src/components/landing/sampleReader');
  const fv = await import('../src/lib/personalization/forecastView');
  const { parseSeekerProfile } = await import('../src/lib/personalization/parse');
  const { addDays } = await import('../src/lib/personalization/eventDate');
  const { stripJsonDebris } = await import('../src/lib/personalization/forecastPrompt');
  const { monthsWithIngressHints } = await import('../src/lib/reports/ingressHints');

  const out = resolve(process.cwd(), 'src/components/landing/sampleForecast.ts');
  const eph = process.env.EPHEMERIS_SERVICE_URL ?? 'http://127.0.0.1:8000';
  const base = `http://127.0.0.1:${arg('port', '3217')}`;
  const logFile = arg('log');
  const headers = { 'x-bypass-token': process.env.PROBE_SECRET ?? 'probe-local' };

  // ── the engine must be Lahiri, on the worker thread that answers requests ──
  const health = (await (await fetch(`${eph}/health`)).json()) as Json;
  if (!health.ayanamsa_ok || !health.worker_thread_ok) throw new Error(`Engine is not Lahiri on its worker thread: ${JSON.stringify(health)}`);

  // ── chart and thirty real days ──
  const chart = await post(`${eph}/natal-chart`, sr.SAMPLE_BIRTH);
  const dates = Array.from({ length: sr.SAMPLE_WINDOW_DAYS }, (_, i) => addDays(sr.SAMPLE_WINDOW_START, i));
  const grid = await post(`${eph}/generate-daily-grid-batch`, {
    dates,
    current_lat: sr.SAMPLE_CITY.lat,
    current_lng: sr.SAMPLE_CITY.lng,
    timezone_offset_minutes: 330,
    natal_lagna_sign_index: SIGNS.indexOf(chart.lagna),
  });
  const days = grid.days as Json[];
  if (days.length !== sr.SAMPLE_WINDOW_DAYS) throw new Error(`expected ${sr.SAMPLE_WINDOW_DAYS} days, got ${days.length}`);

  const md = chart.current_dasha.mahadasha as string;
  const mdRow = (chart.dasha_sequence as Json[]).find((d) => d.planet === md)!;
  const rk = (d: Json) => (d.rahu_kaal ? `${String(d.rahu_kaal.start).slice(0, 5)}–${String(d.rahu_kaal.end).slice(0, 5)}` : null);
  const dayViews: import('../src/lib/personalization/forecastView').DayView[] = days.map((d) => ({
    date: d.date,
    score: d.day_score,
    rahuKaal: rk(d),
    slots: d.slots.map((s: Json) => ({ label: s.display_label, score: s.score, rahuKaal: Boolean(s.is_rahu_kaal) })),
  }));

  // the reader's date and the day to prepare on, found the same way the report page finds them
  const profile = parseSeekerProfile(sr.SAMPLE_READER_CONTEXT);
  const ev = fv.buildEventView(profile, dayViews, []);
  if (!ev || ev.kind !== 'in_window') throw new Error(`The sample reader's date must fall inside the window; got ${ev?.kind}`);
  const eventDate = ev.date;
  const prepDate = ev.prepDay?.date ?? dates[0];
  const eventIdx = dates.indexOf(eventDate);

  // ── the written half ──
  let written: Json;
  let spent = 0;
  if (flag('engine-only')) {
    if (!existsSync(out)) throw new Error('--engine-only needs an existing sampleForecast.ts to keep the written half from');
    const mod = await import('../src/components/landing/sampleForecast');
    written = mod.SAMPLE_FORECAST.written as Json;
  } else {
    let offset = logFile ? statSync(logFile).size : 0;
    const usage = () => {
      if (!logFile) return 0;
      const text = readFileSync(logFile, 'utf8');
      const fresh = text.slice(offset);
      offset = text.length;
      let usd = 0;
      for (const line of fresh.split(/\r?\n/)) {
        const i = line.indexOf('{"type":"llm_usage"');
        if (i < 0) continue;
        try {
          const j = JSON.parse(line.slice(i)) as { model: string; input: number | null; output: number | null };
          usd += costUsd(j.model, j.input ?? 0, j.output ?? 0) ?? 0;
        } catch {
          /* partial line */
        }
      }
      return usd;
    };
    // A failed run must not cost twice: every reply is kept in --cache and reused on the next run.
    const cacheFile = arg('cache');
    const cache: Record<string, Json> = cacheFile && existsSync(cacheFile) ? (JSON.parse(readFileSync(cacheFile, 'utf8')) as Record<string, Json>) : {};
    const call = async (name: string, path: string, body: unknown) => {
      if (cache[name]) {
        console.log(`${name}: reused from cache`);
        return cache[name];
      }
      usage();
      const t0 = Date.now();
      const json = await post(`${base}${path}`, body, headers);
      await new Promise((r) => setTimeout(r, 700));
      const usd = usage();
      spent += usd;
      console.log(`${name}: ${Math.round((Date.now() - t0) / 1000)}s  ${usd.toFixed(4)}`);
      if (cacheFile) {
        cache[name] = json;
        writeFileSync(cacheFile, JSON.stringify(cache));
      }
      return json;
    };

    const reading = 'claude-sonnet-5-5';
    const common = {
      lagnaSign: chart.lagna,
      mahadasha: md,
      antardasha: chart.current_dasha.antardasha,
      personal_context: sr.SAMPLE_READER_CONTEXT,
      require_scripture_grounding: false,
      model_override: reading,
    };
    const dayPayload = (d: Json) => ({
      date: d.date,
      panchang: d.panchang,
      planet_positions: d.planet_positions,
      slots: d.slots.map((s: Json) => ({ display_label: s.display_label, score: s.score, dominant_choghadiya: s.dominant_choghadiya })),
      day_score: d.day_score,
      rahu_kaal: d.rahu_kaal,
      peak_slots: d.slots
        .filter((s: Json) => s.score >= 75)
        .slice(0, 3)
        .map((s: Json) => ({ display_label: s.display_label, dominant_hora: s.dominant_hora, dominant_choghadiya: s.dominant_choghadiya, score: s.score })),
    });

    const nativity = await call('nativity-text', '/api/commentary/nativity-text', {
      ...common,
      lagnaDegreee: chart.lagna_degree,
      moonSign: chart.planets.Moon.sign,
      moonNakshatra: chart.planets.Moon.nakshatra,
      md_end: mdRow.end_date,
      ad_end: chart.current_dasha.end_date,
      planets: chart.planets,
    });

    const pick = Array.from(new Set([dates[0], prepDate, eventDate])).sort();
    const daily = await call(`daily-overviews (${pick.length} days)`, '/api/commentary/daily-overviews', {
      ...common,
      days: pick.map((date) => dayPayload(days[dates.indexOf(date)])),
    });

    // The same monthly prompts a real report builds: the Lahiri ingress table plus the engine's own 30 days.
    const allMonths = monthsWithIngressHints(days as { date: string; planet_positions?: unknown }[], chart.lagna, 6);
    const months = await call('months-first (6 months, ingress hints)', '/api/commentary/months-first', {
      ...common,
      startMonth: sr.SAMPLE_WINDOW_START.slice(0, 7),
      reference_planet_positions: days[0].planet_positions,
      reference_planet_positions_date: days[0].date,
      reference_panchang: days[0].panchang,
      reference_rahu_kaal: days[0].rahu_kaal,
      reference_slots: days[0].slots.map((s: Json) => ({ display_label: s.display_label, score: s.score, dominant_choghadiya: s.dominant_choghadiya })),
      months: allMonths,
    });

    const weeks = Array.from({ length: Math.ceil(days.length / 7) }, (_, w) => {
      const slice = days.slice(w * 7, w * 7 + 7);
      return { week_label: `${slice[0].date}`, start_date: slice[0].date, end_date: slice[slice.length - 1].date, daily_scores: slice.map((d) => d.day_score) };
    });
    const sorted = [...days].sort((a, b) => b.day_score - a.day_score);
    const weeksOut = await call('weeks-synthesis', '/api/commentary/weeks-synthesis', {
      ...common,
      reportStartDate: days[0].date,
      weeks,
      planet_positions_by_date: days.map((d) => ({
        date: d.date,
        planet_positions: d.planet_positions,
        panchang: d.panchang,
        rahu_kaal: d.rahu_kaal,
        slots: d.slots.map((s: Json) => ({ display_label: s.display_label, score: s.score, dominant_choghadiya: s.dominant_choghadiya })),
      })),
      synthesis_context: {
        total_days: days.length,
        best_date: sorted[0].date,
        best_score: sorted[0].day_score,
        worst_date: sorted[sorted.length - 1].date,
        worst_score: sorted[sorted.length - 1].day_score,
        avg_score: Math.round(days.reduce((a, d) => a + d.day_score, 0) / days.length),
      },
    });

    const ed = days[eventIdx];
    const hourly = await call('hourly-batch (event day)', '/api/commentary/hourly-batch', {
      ...common,
      model_override: 'claude-haiku-5-5',
      days: [
        {
          dayIndex: 0,
          date: ed.date,
          planet_positions: ed.planet_positions,
          panchang: ed.panchang,
          rahu_kaal: ed.rahu_kaal,
          slots: ed.slots.map((s: Json) => ({
            slot_index: s.slot_index,
            display_label: s.display_label,
            dominant_hora: s.dominant_hora,
            dominant_choghadiya: s.dominant_choghadiya,
            transit_lagna: s.transit_lagna,
            transit_lagna_house: s.transit_lagna_house,
            is_rahu_kaal: s.is_rahu_kaal,
            score: s.score,
          })),
        },
      ],
    });

    written = {
      model: reading,
      hourlyModel: 'claude-haiku-5-5',
      nativity: { lagnaAnalysis: nativity.lagna_analysis, dashaInterpretation: nativity.dasha_interpretation },
      // Only text whose checkable claims were checked against the engine's own numbers is kept (see the notes in
      // sampleReport.test.ts). Left out: the planetary movements of months after the first, the weekly texts other
      // than the interview week's, the per-date reasons, and every month after January 2027. The ingress table the
      // monthly prompts rely on (src/lib/reports/ingressHints.ts) ends in January 2027, and the text for the months
      // after it says "no major sign change" when the Sun and Mars change sign in every one of them.
      //
      // stripJsonDebris is what the daily route itself now runs; applying it here keeps a reply recorded
      // before that fix identical to what the route returns today.
      daily: (daily.days as Json[])
        .filter((d) => d.date === prepDate || d.date === eventDate)
        .map((d) => ({ date: d.date, theme: stripJsonDebris(d.day_theme), overview: stripJsonDebris(d.day_overview) })),
      months: (months.months as Json[]).slice(0, 4).map((m, i) => {
        const parts = splitMonth(String(m.analysis ?? ''));
        return {
          label: m.month_label,
          overall: m.overall_score,
          career: m.career_score,
          money: m.money_score,
          health: m.health_score,
          love: m.love_score,
          intimacy: m.intimacy_score,
          theme: m.theme,
          opening: i === 0 ? parts.opening : '',
          movements: i === 0 ? parts.movements : '',
          closing: i === 0 ? parts.closing : '',
        };
      }),
      // The route always returns six weeks, padding a 30-day window with an "Overflow" week scored 0; drop it.
      weeks: (weeksOut.weeks as Json[])
        .slice(0, Math.ceil(days.length / 7))
        .map((w, i) => {
          const text = String(w.analysis ?? '');
          const best = text.match(/\nBEST:\s*(.+)/)?.[1]?.trim() ?? '';
          const worst = text.match(/\nWORST:\s*(.+)/)?.[1]?.trim() ?? '';
          const body = text.replace(/\n(BEST|WORST):.*/g, '').trim();
          return { label: w.week_label, score: w.overall_score, theme: w.theme, analysis: i === Math.floor(eventIdx / 7) ? body : '', best, worst };
        }),
      synthesis: {
        opening: weeksOut.period_synthesis.opening_paragraph,
        closing: weeksOut.period_synthesis.closing_paragraph,
        career: weeksOut.period_synthesis.domain_priorities.career,
        money: weeksOut.period_synthesis.domain_priorities.money,
      },
      hourly: ((hourly.days as Json[])[0].slots as Json[]).map((s) => ({
        index: s.slot_index,
        short: String(s.commentary_short ?? '').replace(/[⚠⚡]️?\s*/g, ''),
        full: String(s.commentary ?? '').replace(/[⚠⚡]️?\s*/g, ''),
      })),
    };
    console.log(`model spend this run: $${spent.toFixed(4)}`);
  }

  const data = {
    generatedFor: sr.SAMPLE_READER_CONTEXT,
    generatedOn: new Date().toISOString().slice(0, 10),
    ayanamsa: String(health.ayanamsa),
    window: { start: dates[0], end: dates[dates.length - 1], days: dates.length, city: sr.SAMPLE_CITY.name },
    event: { date: eventDate, prepDate },
    chart: {
      lagna: chart.lagna,
      lagnaDegree: Math.round(chart.lagna_degree * 100) / 100,
      moonNakshatra: chart.planets.Moon.nakshatra,
      moonPada: chart.planets.Moon.nakshatra_pada,
      placements: Object.entries(chart.planets as Json).map(([planet, p]) => ({ planet, sign: p.sign, house: p.house, degree: Math.round(p.degree * 100) / 100 })),
      currentDasha: chart.current_dasha,
      mahadashas: (chart.dasha_sequence as Json[]).map((d) => ({ lord: d.planet, start: d.start_date, end: d.end_date })),
      antardashas: ((chart.dasha_sequence as Json[]).find((d) => d.planet === md)!.antardasha as Json[]).map((a) => ({ lord: a.planet, start: a.start_date, end: a.end_date })),
    },
    days: days.map((d, i) => ({
      date: d.date,
      weekday: d.weekday,
      score: d.day_score,
      rahuKaal: rk(d),
      slots: d.slots.map((s: Json) => ({
        label: s.display_label,
        score: s.score,
        rahuKaal: Boolean(s.is_rahu_kaal),
        ...(i === eventIdx ? { hora: s.dominant_hora, chog: s.dominant_choghadiya } : {}),
      })),
    })),
    written,
  };

  const header = `/**
 * GENERATED by scripts/gen-sample-forecast.ts. Do not edit by hand; regenerate instead.
 *
 * Everything here is real output for ONE INVENTED reader (src/components/landing/sampleReader.ts):
 *  - the chart, dasha and the 30 days of scores and hourly windows are the deterministic engine's
 *    (Lahiri, whole-sign houses, Bangalore for the city-dependent times);
 *  - the written parts are what the commentary routes returned for her quiz answers, unedited
 *    except that the monthly and weekly text is split into its parts, stray braces are removed
 *    (as the routes now do), warning symbols are dropped from the hourly notes, and the text
 *    whose claims did not hold against the engine's numbers is left out (see the comment where
 *    "written" is built in the generator).
 * Regenerate when the engine, the prompts or sampleReader.ts change. sampleReport.test.ts fails if
 * the answers here are not the ones in sampleReader.ts.
 */
`;
  const types = `
export interface SampleSlotRow { label: string; score: number; rahuKaal: boolean; hora?: string; chog?: string }
export interface SampleDayRow { date: string; weekday: string; score: number; rahuKaal: string | null; slots: SampleSlotRow[] }
export interface SamplePlacement { planet: string; sign: string; house: number; degree: number }
export interface SamplePeriod { lord: string; start: string; end: string }
/** opening, movements and closing are written for the first month only; later months carry scores and a theme. */
export interface SampleMonth { label: string; overall: number; career: number; money: number; health: number; love: number; intimacy: number; theme: string; opening: string; movements: string; closing: string }
/** analysis is written for the week that holds the reader's date only. */
export interface SampleWeek { label: string; score: number; theme: string; analysis: string; best: string; worst: string }
export interface SampleSynthesis { opening: string; closing: string; career: string; money: string }
export interface SampleForecast {
  generatedFor: string;
  generatedOn: string;
  ayanamsa: string;
  window: { start: string; end: string; days: number; city: string };
  event: { date: string; prepDate: string };
  chart: {
    lagna: string;
    lagnaDegree: number;
    moonNakshatra: string;
    moonPada: number;
    placements: SamplePlacement[];
    currentDasha: { mahadasha: string; antardasha: string; start_date: string; end_date: string };
    mahadashas: SamplePeriod[];
    antardashas: SamplePeriod[];
  };
  days: SampleDayRow[];
  written: {
    model: string;
    hourlyModel: string;
    nativity: { lagnaAnalysis: string; dashaInterpretation: string };
    daily: { date: string; theme: string; overview: string }[];
    months: SampleMonth[];
    weeks: SampleWeek[];
    synthesis: SampleSynthesis;
    hourly: { index: number; short: string; full: string }[];
  };
}
`;
  writeFileSync(out, `${header}${types}\nexport const SAMPLE_FORECAST: SampleForecast = ${JSON.stringify(data, null, 1)};\n`);
  console.log(`wrote ${out}  event ${eventDate} (day score ${days[eventIdx].day_score}), prep ${prepDate}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
