/**
 * Simulates the report generation pipeline and prints the 4 verification checks.
 * Run with: node scripts/generate-report-test.mjs
 * Requires: Next.js dev server (npm run dev) and ephemeris on port 8000 or 8001.
 */

const BASE = process.env.BASE_URL || 'http://localhost:3000';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} ${res.status}: ${await res.text()}`);
  return res.json();
}

async function main() {
  console.log('Generating report (Aarsh, 1991-01-05 19:45 Lucknow, Dubai, 7-day)...\n');

  const today = new Date();
  const dateRange = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  // Step 1: Ephemeris
  const ephemerisRes = await fetch(`${BASE}/api/agents/ephemeris`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'natal-chart',
      birth_date: '1991-01-05',
      birth_time: '19:45:00',
      birth_city: 'Lucknow',
      birth_lat: 26.8467,
      birth_lng: 80.9462,
    }),
  });
  if (!ephemerisRes.ok) throw new Error('Ephemeris failed: ' + (await ephemerisRes.text()));
  const ephemerisData = (await ephemerisRes.json()).data || (await ephemerisRes.json());

  const lagnaIndex = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'].indexOf(ephemerisData?.lagna ?? '') || 0;
  const cLat = 25.2048;
  const cLng = 55.2708;
  const tzOffset = 240;

  // Step 2: Nativity (optional)
  let nativityProfile = null;
  try {
    const natRes = await fetch(`${BASE}/api/agents/nativity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ natalChart: ephemerisData }),
    });
    if (natRes.ok) nativityProfile = (await natRes.json()).data || await natRes.json();
  } catch (_) {}

  // Step 3: Daily grids
  const dailyGridResults = await Promise.all(
    dateRange.map((d) =>
      post('/api/agents/daily-grid', {
        date: d,
        currentLat: cLat,
        currentLng: cLng,
        timezoneOffset: tzOffset,
        natal_lagna_sign_index: lagnaIndex >= 0 ? lagnaIndex : 3,
      }).catch(() => null)
    )
  );

  const forecastDays = dailyGridResults.map((r, i) => {
    if (!r)
      return {
        date: dateRange[i],
        panchang: {},
        rahu_kaal: { start: '', end: '' },
        day_score: 50,
        slots: Array.from({ length: 18 }, (_, si) => ({
          slot_index: si,
          display_label: `${String(6 + si).padStart(2, '0')}:00–${String(7 + si).padStart(2, '0')}:00`,
          dominant_hora: 'Moon',
          dominant_choghadiya: 'Chal',
          transit_lagna: '',
          transit_lagna_house: 1,
          is_rahu_kaal: false,
          score: 50,
        })),
      };
    const rahu = r.rahu_kaal ?? {};
    return {
      date: r.date ?? dateRange[i],
      panchang: r.panchang ?? {},
      rahu_kaal: { start: rahu.start ?? '', end: rahu.end ?? '' },
      day_score: r.day_score ?? 50,
      slots: (r.slots ?? []).map((s) => ({
        slot_index: s.slot_index,
        display_label: s.display_label ?? '06:00–07:00',
        dominant_hora: s.dominant_hora ?? s.hora_ruler ?? '',
        dominant_choghadiya: s.dominant_choghadiya ?? s.choghadiya ?? '',
        transit_lagna: s.transit_lagna ?? '',
        transit_lagna_house: s.transit_lagna_house ?? 1,
        is_rahu_kaal: s.is_rahu_kaal ?? false,
        score: s.score ?? 50,
      })),
    };
  });

  const dasha = ephemerisData?.current_dasha ?? {};
  const mahadasha = dasha.mahadasha ?? 'Unknown';
  const antardasha = dasha.antardasha ?? 'Unknown';

  // Step 4: Daily overviews
  let overviewDays = [];
  try {
    const overviewRes = await fetch(`${BASE}/api/commentary/daily-overviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lagnaSign: ephemerisData.lagna,
        mahadasha,
        antardasha,
        days: forecastDays.map((d) => ({
          date: d.date,
          panchang: d.panchang,
          day_score: d.day_score,
          rahu_kaal: d.rahu_kaal,
          peak_slots: d.slots.filter((s) => s.score >= 75).slice(0, 3).map((s) => ({
            display_label: s.display_label,
            dominant_hora: s.dominant_hora,
            dominant_choghadiya: s.dominant_choghadiya,
            score: s.score,
          })),
        })),
      }),
    });
    if (overviewRes.ok) overviewDays = (await overviewRes.json()).days ?? [];
  } catch (e) {
    console.warn('Daily overviews failed:', e.message);
  }

  // Step 5: Nativity text
  try {
    await fetch(`${BASE}/api/commentary/nativity-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lagnaSign: ephemerisData.lagna,
        lagnaDegreee: ephemerisData.lagna_degree,
        moonSign: ephemerisData.planets?.Moon?.sign,
        moonNakshatra: ephemerisData.planets?.Moon?.nakshatra ?? ephemerisData.moon_nakshatra,
        mahadasha,
        antardasha,
        md_end: dasha.end_date,
        ad_end: dasha.end_date,
        planets: ephemerisData.planets ?? {},
      }),
    });
  } catch (_) {}

  // Step 6: Hourly (first day only to save time)
  try {
    const day = forecastDays[0];
    await fetch(`${BASE}/api/commentary/hourly-day`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lagnaSign: ephemerisData.lagna,
        mahadasha,
        antardasha,
        dayIndex: 0,
        date: day.date,
        slots: day.slots.map((s) => ({
          slot_index: s.slot_index,
          display_label: s.display_label,
          dominant_hora: s.dominant_hora,
          dominant_choghadiya: s.dominant_choghadiya,
          transit_lagna: s.transit_lagna,
          transit_lagna_house: s.transit_lagna_house,
          is_rahu_kaal: s.is_rahu_kaal,
          score: s.score,
        })),
      }),
    });
  } catch (_) {}

  // Step 7: Months
  const startDate = new Date(forecastDays[0].date);
  const allMonths = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + i);
    return {
      month_label: d.toLocaleString('default', { month: 'long', year: 'numeric' }),
      month_index: i,
      key_transits_hint: '',
    };
  });
  let months1 = [],
    months2 = [];
  try {
    const r1 = await fetch(`${BASE}/api/commentary/months-first`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lagnaSign: ephemerisData.lagna,
        mahadasha,
        antardasha,
        startMonth: forecastDays[0].date.substring(0, 7),
        months: allMonths.slice(0, 6),
      }),
    });
    if (r1.ok) months1 = (await r1.json()).months ?? [];
  } catch (_) {}
  await sleep(2000);
  try {
    const r2 = await fetch(`${BASE}/api/commentary/months-second`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lagnaSign: ephemerisData.lagna,
        mahadasha,
        antardasha,
        startMonth: forecastDays[0].date.substring(0, 7),
        months: allMonths.slice(6, 12),
      }),
    });
    if (r2.ok) months2 = (await r2.json()).months ?? [];
  } catch (_) {}

  // Step 8: Weeks + Synthesis
  const reportStart = new Date(forecastDays[0].date);
  const weeksPayload = Array.from({ length: 6 }, (_, i) => {
    const wStart = new Date(reportStart);
    wStart.setDate(wStart.getDate() + i * 7);
    const wEnd = new Date(wStart);
    wEnd.setDate(wEnd.getDate() + 6);
    const fmt = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const weekDays = forecastDays.slice(i * 7, (i + 1) * 7);
    return {
      week_index: i,
      week_label: `${fmt(wStart)} – ${fmt(wEnd)}`,
      start_date: wStart.toISOString().split('T')[0],
      end_date: wEnd.toISOString().split('T')[0],
      daily_scores: weekDays.map((d) => d.day_score ?? 55),
    };
  });
  const allScores = forecastDays.map((d) => d.day_score ?? 55);
  const bestDay = forecastDays.reduce((a, b) => ((a.day_score ?? 0) > (b.day_score ?? 0) ? a : b));
  const worstDay = forecastDays.reduce((a, b) => ((a.day_score ?? 100) < (b.day_score ?? 100) ? a : b));

  let weeksSynthData = { weeks: [], period_synthesis: null };
  try {
    const weeksRes = await fetch(`${BASE}/api/commentary/weeks-synthesis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lagnaSign: ephemerisData.lagna ?? 'Cancer',
        mahadasha: mahadasha ?? 'Rahu',
        antardasha: antardasha ?? 'Mercury',
        reportStartDate: forecastDays[0].date,
        weeks: weeksPayload,
        synthesis_context: {
          total_days: forecastDays.length,
          best_date: bestDay.date,
          best_score: bestDay.day_score ?? 0,
          worst_date: worstDay.date,
          worst_score: worstDay.day_score ?? 0,
          avg_score: Math.round(allScores.reduce((a, b) => a + b, 0) / (allScores.length || 1)),
        },
      }),
    });
    if (weeksRes.ok) weeksSynthData = await weeksRes.json();
  } catch (e) {
    console.warn('Weeks-synthesis failed:', e.message);
  }

  // --- Verification output ---
  console.log('========== VERIFICATION ==========\n');

  console.log('1) STEP8 in terminal:');
  console.log('   [STEP8] weeks: 6 and [STEP8] synthesis: true appear in the BROWSER CONSOLE when you generate the report from the UI (page.tsx runs in the client). This script calls the API directly, so you will not see those logs here. API response:');
  console.log('   weeks count:', weeksSynthData.weeks?.length ?? 0);
  console.log('   synthesis present:', !!weeksSynthData.period_synthesis);
  console.log('');

  console.log('2) Seven day scores (daily score calendar):');
  const dayScores = forecastDays.map((d) => d.day_score);
  console.log('   ', dayScores.join(', '));
  console.log('');

  const day1Overview = overviewDays.find((od) => od.date === forecastDays[0]?.date)?.day_overview ?? '';
  console.log('3) Day 1 overview starts with ALL-CAPS headline?');
  const firstLine = day1Overview.split('\n')[0]?.trim() ?? '';
  const allCapsStart = /^[A-Z][A-Z0-9\s—\-–]+$/.test(firstLine) || (firstLine.length > 10 && firstLine === firstLine.toUpperCase());
  console.log('   First 120 chars:', firstLine.slice(0, 120) || '(empty)');
  console.log('   ALL-CAPS start:', allCapsStart ? 'YES' : 'NO');
  console.log('');

  const opening = weeksSynthData.period_synthesis?.opening_paragraph ?? '';
  console.log('4) Synthesis section: real text or fallback?');
  console.log('   First 200 chars:', opening.slice(0, 200) || '(empty)');
  const isFallback = !opening || opening.length < 50 || /fallback|generating|will be available/i.test(opening);
  console.log('   Real text:', isFallback ? 'NO (fallback/empty)' : 'YES');
  console.log('\n====================================');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
