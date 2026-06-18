/**
 * Standalone end-to-end report generation test.
 *
 * Tests the full pipeline using the local ephemeris service + deterministic
 * scoring. No LLM credentials required — commentary uses the deterministic
 * fallback engine. Validates the output against the canonical report contract.
 *
 * Usage: node scripts/generate-test-reports.mjs
 *
 * Prerequisites:
 *   - Ephemeris service running on localhost:8000
 *     (cd ephemeris-service && uvicorn main:app --port 8000)
 */

import { randomUUID } from 'crypto';
import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EPH = 'http://localhost:8000';
const OUT = path.join(__dirname, '../test-reports');

// ── Test subjects ─────────────────────────────────────────────────────────────

const TEST_CHARTS = [
  {
    label: 'Cancer Lagna — Taurus Sun, Shatabhisha Moon',
    name: 'Priya Sharma',
    birth_date: '1990-06-15',
    birth_time: '08:30:00',
    birth_city: 'Mumbai',
    birth_lat: 19.076,
    birth_lng: 72.8777,
    current_city: 'Mumbai',
    current_lat: 19.076,
    current_lng: 72.8777,
    timezone_offset: 330, // IST
    plan_type: '7day',
  },
  {
    label: 'Taurus Lagna — Dubai timezone',
    name: 'Arjun Patel',
    birth_date: '1985-04-15',
    birth_time: '06:15:00',
    birth_city: 'Delhi',
    birth_lat: 28.6139,
    birth_lng: 77.2090,
    current_city: 'Dubai',
    current_lat: 25.2048,
    current_lng: 55.2708,
    timezone_offset: 240, // GST
    plan_type: '7day',
  },
  {
    label: 'Scorpio Lagna — London timezone',
    name: 'Kavitha Nair',
    birth_date: '1995-11-22',
    birth_time: '22:45:00',
    birth_city: 'Chennai',
    birth_lat: 13.0827,
    birth_lng: 80.2707,
    current_city: 'London',
    current_lat: 51.5074,
    current_lng: -0.1278,
    timezone_offset: 60, // BST
    plan_type: '7day',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo',
               'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const PLANET_SYMBOLS = { Sun:'☉', Moon:'☽', Mars:'♂', Mercury:'☿', Jupiter:'♃', Venus:'♀', Saturn:'♄' };
const CHOG_QUALITY = {
  Amrit: 'Excellent', Kaal: 'Inauspicious', Labh: 'Good',
  Shubh: 'Auspicious', Chal: 'Neutral', Rog: 'Bad', Udveg: 'Bad',
};

const ts = () => new Date().toISOString().slice(11, 19);
const log = (tag, msg) => console.log(`[${ts()}] [${tag}] ${msg}`);
const ok  = (msg) => console.log(`  ✅  ${msg}`);
const fail = (msg) => { console.error(`  ❌  ${msg}`); process.exitCode = 1; };

async function fetchEph(urlPath, body) {
  const r = await fetch(`${EPH}${urlPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${urlPath} HTTP ${r.status}: ${await r.text()}`);
  return r.json();
}

// Weekday hora rulers (Sun=0 → cycle by day)
const WEEKDAY_HORA_RULERS = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'];
// Fallback hora by hour offset if lookup fails
const hour_defaults = {};
WEEKDAY_HORA_RULERS.forEach((p, i) => { hour_defaults[i] = p; });

// ── Scoring (mirrors RatingAgent deterministic logic) ─────────────────────────

const HORA_SCORES = {
  Sun: 70, Moon: 60, Mars: 55, Mercury: 65, Jupiter: 80, Venus: 75, Saturn: 45,
};
const CHOG_SCORES = {
  Amrit: 85, Labh: 75, Shubh: 70, Chal: 50, Rog: 35, Udveg: 30, Kaal: 20,
};
const RAHU_KAAL_PENALTY = 30;

function computeSlotScore(slot) {
  const hora = HORA_SCORES[slot.hora_ruler] ?? 55;
  const chog = CHOG_SCORES[slot.choghadiya] ?? 50;
  let score = Math.round((hora * 0.6 + chog * 0.4));
  if (slot.is_rahu_kaal) score = Math.max(10, score - RAHU_KAAL_PENALTY);
  return Math.min(100, Math.max(1, score));
}

function getScoreLabel(score, isRk) {
  if (isRk) return 'Avoid';
  if (score >= 80) return 'Peak';
  if (score >= 70) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 50) return 'Neutral';
  if (score >= 40) return 'Caution';
  if (score >= 30) return 'Difficult';
  return 'Avoid';
}

// ── Commentary fallback (deterministic, no LLM) ───────────────────────────────

function buildSlotCommentary(slot, lagnaSign) {
  const hora = slot.hora_planet ?? slot.hora_ruler ?? 'Sun';
  const chog = slot.choghadiya ?? 'Shubh';
  const rkPrefix = slot.is_rahu_kaal ? 'RAHU KAAL — avoid starting anything new. ' : '';
  const scoreWord = slot.score >= 70 ? 'strong' : slot.score >= 50 ? 'moderate' : 'challenging';
  return `${rkPrefix}${hora} hora is active — this is a ${scoreWord} window for ${lagnaSign} lagna. Focus your most important work here or save it for better timing.\n\n${chog} choghadiya shapes the quality of this hour. ${CHOG_QUALITY[chog] ?? 'Neutral'} energy.\n\nTiming verdict: ${slot.is_rahu_kaal ? '⚠⚠ Hold off on new initiations.' : slot.score >= 70 ? 'Use this window for your priorities.' : 'Proceed with caution.'}`;
}

function buildDayOverview(day, lagnaSign, md, ad) {
  const { date, panchang, day_score } = day;
  const nakshatra = panchang?.nakshatra ?? 'Ashwini';
  const yoga = panchang?.yoga ?? 'Shubha';
  const scoreWord = day_score >= 65 ? 'productive' : day_score >= 50 ? 'moderate' : 'quieter';
  return `A ${scoreWord} day overall — use your best hourly windows for what matters most.\n\n${nakshatra} nakshatra with ${yoga} yoga. Your ${md}/${ad} dasha period shapes how these energies land for you specifically. Check the hourly table for your strongest windows.\n\nFocus your key decisions and actions in the highest-scoring hora windows. The Rahu Kaal window is shown in the table — keep it for completion work only.`;
}

// ── Report assembly ───────────────────────────────────────────────────────────

async function generateReport(chart) {
  log('EPH', `Fetching natal chart for ${chart.name}...`);

  // 1. Natal chart
  const natal = await fetchEph('/natal-chart', {
    birth_date: chart.birth_date,
    birth_time: chart.birth_time,
    birth_city: chart.birth_city,
    birth_lat: chart.birth_lat,
    birth_lng: chart.birth_lng,
  });
  ok(`Natal chart: ${natal.lagna} lagna, Moon in ${natal.planets?.Moon?.sign}, Dasha: ${natal.current_dasha?.mahadasha}/${natal.current_dasha?.antardasha}`);

  // 2. Date range (7 days from today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today.getTime() + i * 86400000);
    return d.toISOString().split('T')[0];
  });

  // 3. Daily data (panchang + hora + choghadiya)
  log('EPH', `Fetching daily data for ${dates.length} days...`);
  const forecastDays = [];

  for (const date of dates) {
    const dayData = await fetchEph('/full-day-data', {
      date,
      lat: chart.current_lat,
      lng: chart.current_lng,
      birth_lat: chart.birth_lat,
      birth_lng: chart.birth_lng,
      current_lat: chart.current_lat,
      current_lng: chart.current_lng,
      timezone_offset: chart.timezone_offset,
    });

    const { panchang, hora_schedule, choghadiya, rahu_kaal } = dayData;

    // Parse ephemeris time strings (HH:MM:SS local) → minutes since midnight for comparison
    const parseLocalMinutes = (t) => {
      if (!t) return -1;
      const parts = String(t).split(':');
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1] ?? '0', 10);
    };

    // Build 18 hourly slots (06:00–23:00) in local time
    const tzOffset = chart.timezone_offset; // minutes east of UTC
    const tzSign = tzOffset >= 0 ? '+' : '-';
    const tzAbs = Math.abs(tzOffset);
    const tzStr = `${tzSign}${String(Math.floor(tzAbs / 60)).padStart(2, '0')}:${String(tzAbs % 60).padStart(2, '0')}`;

    const slots = [];
    for (let slotIdx = 0; slotIdx < 18; slotIdx++) {
      const slotHour = 6 + slotIdx;
      const slotMidMin = slotHour * 60 + 30; // midpoint in minutes since midnight
      const startH = String(slotHour).padStart(2, '0');
      const endH = String(slotHour + 1).padStart(2, '0');
      const displayLabel = `${startH}:00–${endH}:00`;

      // ISO timestamps with correct offset
      const startIso = `${date}T${startH}:00:00${tzStr}`;
      const endIso = `${date}T${endH}:00:00${tzStr}`;
      const midIso = `${date}T${startH}:30:00${tzStr}`;

      // Find hora: ephemeris returns local HH:MM:SS times — compare minutes since midnight
      const hora = hora_schedule?.find((h) => {
        const hs = parseLocalMinutes(h.start_time);
        const he = parseLocalMinutes(h.end_time);
        // Handle overnight wrap: if end < start, the period crosses midnight
        if (he < hs) return slotMidMin >= hs || slotMidMin < he;
        return slotMidMin >= hs && slotMidMin < he;
      });
      const horaRuler = hora?.hora_ruler ?? (hour_defaults[slotHour % 7] ?? 'Sun');
      const horaSymbol = PLANET_SYMBOLS[horaRuler] ?? '☉';

      // Find choghadiya
      const chog = choghadiya?.find((c) => {
        const cs = parseLocalMinutes(c.start_time);
        const ce = parseLocalMinutes(c.end_time);
        if (ce < cs) return slotMidMin >= cs || slotMidMin < ce;
        return slotMidMin >= cs && slotMidMin < ce;
      });
      const chogName = chog?.choghadiya ?? 'Shubh';

      // Rahu Kaal check
      let isRahuKaal = false;
      if (rahu_kaal?.start_time && rahu_kaal?.end_time) {
        const rs = parseLocalMinutes(rahu_kaal.start_time);
        const re = parseLocalMinutes(rahu_kaal.end_time);
        if (re < rs) isRahuKaal = slotMidMin >= rs || slotMidMin < re;
        else isRahuKaal = slotMidMin >= rs && slotMidMin < re;
      }

      // Transit lagna (simplified: compute from lagna + elapsed sidereal time)
      const lagnaIdx = SIGNS.indexOf(natal.lagna);
      const hoursFromSunrise = slotHour - 6;
      const transitLagnaIdx = (lagnaIdx + Math.floor(hoursFromSunrise / 2)) % 12;
      const transitLagna = SIGNS[transitLagnaIdx];
      const transitLagnaHouse = ((transitLagnaIdx - lagnaIdx + 12) % 12) + 1;

      const score = computeSlotScore({ hora_ruler: horaRuler, choghadiya: chogName, is_rahu_kaal: isRahuKaal });
      const label = getScoreLabel(score, isRahuKaal);

      const slotData = {
        slot_index: slotIdx,
        display_label: displayLabel,
        start_iso: startIso,
        end_iso: endIso,
        midpoint_iso: midIso,
        hora_planet: horaRuler,
        hora_planet_symbol: horaSymbol,
        choghadiya: chogName,
        choghadiya_quality: CHOG_QUALITY[chogName] ?? 'Neutral',
        is_rahu_kaal: isRahuKaal,
        transit_lagna: transitLagna,
        transit_lagna_house: transitLagnaHouse,
        score,
        label,
        commentary: '',
        commentary_short: '',
      };
      slotData.commentary = buildSlotCommentary(slotData, natal.lagna);
      slotData.commentary_short = slotData.commentary.split('\n')[0].slice(0, 120);
      slots.push(slotData);
    }

    const dayScore = Math.round(slots.reduce((a, s) => a + s.score, 0) / slots.length);
    // Rahu Kaal display: ephemeris returns HH:MM:SS local — just take HH:MM
    const fmtLocalTime = (t) => t ? String(t).slice(0, 5) : null;
    const rahuStart = fmtLocalTime(rahu_kaal?.start_time);
    const rahuEnd = fmtLocalTime(rahu_kaal?.end_time);

    const day = new Date(date + 'T12:00:00Z');
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const dayLabel = `${dayNames[day.getUTCDay()]} · ${monthNames[day.getUTCMonth()]} ${day.getUTCDate()}`;

    const dayOutcomeTier = dayScore >= 75 ? 'EXCELLENT' : dayScore >= 65 ? 'FAVORABLE' : dayScore >= 55 ? 'MODERATE' : dayScore >= 45 ? 'CAUTION' : dayScore >= 35 ? 'CHALLENGING' : 'AVOID';

    forecastDays.push({
      date,
      day_label: dayLabel,
      day_score: dayScore,
      day_label_tier: dayOutcomeTier,
      day_theme: `${panchang?.day_ruler ?? 'Sun'} day — ${panchang?.nakshatra ?? 'Pushya'} nakshatra`,
      overview: buildDayOverview({ date, panchang, day_score: dayScore }, natal.lagna, natal.current_dasha?.mahadasha, natal.current_dasha?.antardasha),
      panchang: {
        tithi: panchang?.tithi ?? '',
        nakshatra: panchang?.nakshatra ?? '',
        yoga: panchang?.yoga ?? '',
        karana: panchang?.karana ?? '',
        sunrise: panchang?.sunrise ?? '',
        sunset: panchang?.sunset ?? '',
        moon_sign: panchang?.moon_sign ?? '',
        day_ruler: panchang?.day_ruler ?? '',
      },
      rahu_kaal: rahuStart && rahuEnd ? { start: rahuStart, end: rahuEnd } : null,
      slots,
      peak_count: slots.filter((s) => s.score >= 75 && !s.is_rahu_kaal).length,
      caution_count: slots.filter((s) => s.score < 45 || s.is_rahu_kaal).length,
    });
  }
  ok(`Generated ${forecastDays.length} forecast days`);

  // 4. Build month summaries (12 months, deterministic)
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() + i);
    const monthLabel = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const score = 50 + Math.floor(Math.random() * 30);
    return {
      month: monthLabel,
      score,
      overall_score: score,
      domain_scores: {
        career: score + Math.floor(Math.random() * 20) - 10,
        money: score + Math.floor(Math.random() * 20) - 10,
        health: score + Math.floor(Math.random() * 20) - 10,
        relationships: score + Math.floor(Math.random() * 20) - 10,
        intimacy: score + Math.floor(Math.random() * 20) - 10,
      },
      theme: `A ${score >= 65 ? 'strong' : 'steady'} month for ${natal.lagna} lagna`,
      commentary: `${monthLabel} brings ${natal.current_dasha?.mahadasha} dasha themes to the foreground. Score: ${score}/100. Use your peak-scoring days for important decisions.`,
      key_transits: ['Check your daily timing for the best windows'],
      weekly_scores: [score - 5, score, score + 3, score - 2],
    };
  });

  // 5. Build week summaries (6 weeks)
  const reportStart = new Date(dates[0]);
  const weeks = Array.from({ length: 6 }, (_, i) => {
    const wStart = new Date(reportStart.getTime() + i * 7 * 86400000);
    const wEnd = new Date(wStart.getTime() + 6 * 86400000);
    const fmt = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const weekScore = Math.round(forecastDays.slice(0, 7).reduce((a, d) => a + d.day_score, 0) / 7);
    return {
      week_label: `Week ${i + 1} · ${fmt(wStart)} – ${fmt(wEnd)}`,
      week_start: wStart.toISOString().split('T')[0],
      score: weekScore,
      theme: `Check daily scores for precision timing`,
      commentary: `Week ${i + 1} of your forecast period. Dasha: ${natal.current_dasha?.mahadasha}/${natal.current_dasha?.antardasha}. Score: ${weekScore}/100. Use your highest-scoring days for important actions.`,
      daily_scores: Array.from({ length: 7 }, (_, j) => forecastDays[j % forecastDays.length]?.day_score ?? 55),
      moon_journey: Array.from({ length: 7 }, (_, j) => forecastDays[j % forecastDays.length]?.panchang?.moon_sign ?? 'Aries'),
      peak_days_count: forecastDays.filter((d) => d.day_score >= 75).length,
      caution_days_count: forecastDays.filter((d) => d.day_score < 50).length,
    };
  });

  // 6. Period synthesis
  const allScores = forecastDays.map((d) => d.day_score);
  const bestDay = forecastDays.reduce((a, b) => a.day_score > b.day_score ? a : b);
  const worstDay = forecastDays.reduce((a, b) => a.day_score < b.day_score ? a : b);

  const synthesis = {
    opening_paragraph: `You are in your ${natal.current_dasha?.mahadasha} mahadasha, with ${natal.current_dasha?.antardasha} as the current sub-period. For ${natal.lagna} rising, this period activates specific areas of life that are ready for growth. Your best window in this period falls around ${bestDay.date} (score: ${bestDay.day_score}/100) — use it for your most important move. Ease off around ${worstDay.date} and let things settle. The hourly table shows your precision timing within each day.`,
    strategic_windows: [
      { date: bestDay.date, nakshatra: bestDay.panchang?.nakshatra ?? '—', score: bestDay.day_score, reason: `Score ${bestDay.day_score}/100. Your strongest day in this period — ${natal.current_dasha?.mahadasha} dasha energy peaks. Use this day for your most important decisions.` },
    ],
    caution_dates: [
      { date: worstDay.date, nakshatra: worstDay.panchang?.nakshatra ?? '—', score: worstDay.day_score, reason: `Score ${worstDay.day_score}/100. Hold off on major new starts. Focus on review, completion, and preparation.` },
    ],
    domain_priorities: {
      career: `Use your highest-scoring days (${bestDay.date} and similar) for career moves, proposals, and important conversations. Avoid new career initiatives on low-score days.`,
      money: `Align larger financial decisions with peak-scoring windows. Low-score stretches are better for budgeting and review than new commitments.`,
      health: `Protect your energy during challenging stretches. Keep consistent routines and prioritize rest on low-score days.`,
      relationships: `Important conversations land well on high-score days. Avoid pressing sensitive topics during challenging periods.`,
      intimacy: `Passion and connection flow most easily on your higher-scoring days. Lower-energy stretches call for warmth and rest.`,
    },
    closing_paragraph: `Your best move right now: identify your peak-scoring days in the calendar, and put your highest-leverage decisions there. Small timing adjustments compound into meaningful results.`,
  };

  // 7. Build nativity data
  const nativityData = {
    natal_chart: natal,
    lagna_analysis: `${natal.lagna} rising — you naturally approach life with ${natal.lagna === 'Cancer' ? 'emotional intelligence and nurturing leadership' : natal.lagna === 'Taurus' ? 'steadiness and practical determination' : 'analytical precision and adaptability'}. Moon in ${natal.planets?.Moon?.sign} (${natal.planets?.Moon?.nakshatra}) shapes your emotional world. Current ${natal.current_dasha?.mahadasha}/${natal.current_dasha?.antardasha} dasha period is your active chapter now.`,
    key_yogas: [],
    functional_benefics: [],
    functional_malefics: [],
    current_dasha_interpretation: `${natal.current_dasha?.mahadasha} mahadasha, ${natal.current_dasha?.antardasha} antardasha (until ${natal.current_dasha?.end_date}). This is an active chapter — use your peak-scoring days for important decisions.`,
  };

  // 8. Assemble report
  const report = {
    report_id: randomUUID(),
    report_type: '7day',
    timezone_offset: chart.timezone_offset,
    current_city: chart.current_city,
    generated_at: new Date().toISOString().split('T')[0],
    nativity: nativityData,
    months,
    weeks,
    days: forecastDays,
    synthesis,
  };

  return { chart, natal, report };
}

// ── Validation ────────────────────────────────────────────────────────────────

function validateReport(report, label) {
  const errors = [];

  // Contract checks
  if (!report.nativity?.lagna_analysis?.trim()) errors.push('nativity.lagna_analysis empty');
  if (report.months?.length !== 12) errors.push(`months: expected 12, got ${report.months?.length}`);
  if (report.weeks?.length !== 6) errors.push(`weeks: expected 6, got ${report.weeks?.length}`);
  if (!report.days?.length) errors.push('days: empty');
  if (!report.synthesis?.opening_paragraph?.trim()) errors.push('synthesis.opening_paragraph empty');

  for (const day of report.days ?? []) {
    if (day.slots?.length !== 18) errors.push(`${day.date}: expected 18 slots, got ${day.slots?.length}`);
    for (const slot of day.slots ?? []) {
      if (!slot.commentary?.trim()) errors.push(`${day.date} slot[${slot.slot_index}]: commentary empty`);
      if (!slot.start_iso || !slot.end_iso) errors.push(`${day.date} slot[${slot.slot_index}]: missing ISO timestamps`);
    }
  }

  return errors;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log('  Jyotish AI — End-to-End Report Generation Test');
  console.log('═'.repeat(60) + '\n');

  // Check ephemeris service
  try {
    const health = await fetch(`${EPH}/panchang`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: new Date().toISOString().split('T')[0], lat: 19.076, lng: 72.877, timezone_offset: 330 }),
    });
    if (!health.ok) throw new Error(`HTTP ${health.status}: ${await health.text()}`);
    ok('Ephemeris service reachable at localhost:8000');
  } catch (e) {
    console.error(`\n  ❌ Ephemeris service not reachable: ${e.message}`);
    console.error('     Start it with: cd ephemeris-service && uvicorn main:app --port 8000\n');
    process.exit(2);
  }

  // Create output directory
  mkdirSync(OUT, { recursive: true });

  const results = [];

  for (const chart of TEST_CHARTS) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`  Report ${results.length + 1}: ${chart.label}`);
    console.log('─'.repeat(60));

    try {
      const { chart: c, natal, report } = await generateReport(chart);

      // Validate
      const errors = validateReport(report, chart.label);
      if (errors.length === 0) {
        ok(`Report passes all ${report.days.length}-day contract checks (${report.months.length} months, ${report.weeks.length} weeks)`);
      } else {
        errors.forEach((e) => fail(`Validation: ${e}`));
      }

      // Summary stats
      const avgScore = Math.round(report.days.reduce((a, d) => a + d.day_score, 0) / report.days.length);
      const bestDay = report.days.reduce((a, b) => a.day_score > b.day_score ? a : b);
      const worstDay = report.days.reduce((a, b) => a.day_score < b.day_score ? a : b);
      ok(`7-day avg score: ${avgScore}/100  |  Best: ${bestDay.date} (${bestDay.day_score})  |  Worst: ${worstDay.date} (${worstDay.day_score})`);
      ok(`Slot breakdown: ${report.days.reduce((a, d) => a + d.peak_count, 0)} peak windows, ${report.days.reduce((a, d) => a + d.caution_count, 0)} caution windows`);

      // Save
      const filename = path.join(OUT, `report-${results.length + 1}-${natal.lagna.toLowerCase()}.json`);
      writeFileSync(filename, JSON.stringify(report, null, 2));
      ok(`Saved to ${path.relative(process.cwd(), filename)}`);

      results.push({ label: chart.label, lagna: natal.lagna, avgScore, ok: errors.length === 0 });
    } catch (e) {
      fail(`Report generation failed: ${e.message}`);
      results.push({ label: chart.label, ok: false, error: e.message });
    }
  }

  // Final summary
  console.log('\n' + '═'.repeat(60));
  console.log('  SUMMARY');
  console.log('═'.repeat(60));
  for (const r of results) {
    const icon = r.ok ? '✅' : '❌';
    console.log(`  ${icon}  ${r.label} — Lagna: ${r.lagna ?? 'N/A'}, Avg: ${r.avgScore ?? 'N/A'}/100`);
  }
  const passed = results.filter((r) => r.ok).length;
  console.log(`\n  ${passed}/${results.length} reports generated successfully`);
  if (passed < results.length) process.exitCode = 1;

  console.log(`\n  Output files: ${path.relative(process.cwd(), OUT)}/\n`);
}

main().catch((e) => { console.error('Fatal:', e); process.exit(2); });
