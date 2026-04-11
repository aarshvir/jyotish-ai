/**
 * Tests for the V2 guidance layer, label logic, validation, and backward compatibility.
 *
 * Run with: npx tsx src/__tests__/guidance.test.ts
 * (No Jest/Vitest in this project — uses simple assertion-based test runner.)
 */

import { getCanonicalScoreLabel, getGuidanceLabel } from '../lib/guidance/labels';
import { buildSlotGuidance, buildDayBriefing } from '../lib/guidance/builder';
import { validateReportData, validateReportSemantics } from '../lib/validation/reportValidation';
import { calculateSlotScore, calculateDayScore, getScoreLabel } from '../lib/agents/RatingAgent';
import type { ReportData, HoraSlot, DayForecast } from '../lib/agents/types';

// ── Test utilities ───────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(message);
    console.error(`  FAIL: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  assert(actual === expected, `${message}: expected "${expected}", got "${actual}"`);
}

function assertIncludes(arr: string[], item: string, message: string) {
  assert(arr.includes(item), `${message}: expected array to include "${item}", got [${arr.join(', ')}]`);
}

function test(name: string, fn: () => void) {
  console.log(`\n  ${name}`);
  try {
    fn();
  } catch (e) {
    failed++;
    failures.push(`${name}: threw ${e instanceof Error ? e.message : String(e)}`);
    console.error(`  FAIL (threw): ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ── TESTS ────────────────────────────────────────────────────────────────────

console.log('\n=== Guidance Layer Tests ===');

// ── 1. Score label mapping ───────────────────────────────────────────────────

test('Canonical label: 90 → Peak', () => {
  assertEqual(getCanonicalScoreLabel(90), 'Peak', 'score 90');
});

test('Canonical label: 80 → Excellent', () => {
  assertEqual(getCanonicalScoreLabel(80), 'Excellent', 'score 80');
});

test('Canonical label: 70 → Good', () => {
  assertEqual(getCanonicalScoreLabel(70), 'Good', 'score 70');
});

test('Canonical label: 55 → Neutral (not Good)', () => {
  assertEqual(getCanonicalScoreLabel(55), 'Neutral', 'score 55');
});

test('Canonical label: 50 → Neutral', () => {
  assertEqual(getCanonicalScoreLabel(50), 'Neutral', 'score 50');
});

test('Canonical label: 49 → Caution', () => {
  assertEqual(getCanonicalScoreLabel(49), 'Caution', 'score 49');
});

test('Canonical label: 35 → Difficult', () => {
  assertEqual(getCanonicalScoreLabel(35), 'Difficult', 'score 35');
});

test('Canonical label: 20 → Avoid', () => {
  assertEqual(getCanonicalScoreLabel(20), 'Avoid', 'score 20');
});

test('Rahu Kaal always → Avoid', () => {
  assertEqual(getCanonicalScoreLabel(90, true), 'Avoid', 'RK score 90');
  assertEqual(getCanonicalScoreLabel(50, true), 'Avoid', 'RK score 50');
});

// ── 2. Parity with RatingAgent.getScoreLabel ─────────────────────────────────

test('Canonical matches RatingAgent for all thresholds', () => {
  const testScores = [5, 20, 34, 35, 44, 45, 49, 50, 55, 64, 65, 74, 75, 84, 85, 90, 98];
  for (const s of testScores) {
    const canonical = getCanonicalScoreLabel(s);
    const rating = getScoreLabel(s);
    assertEqual(canonical, rating, `parity at score ${s}`);
  }
});

test('Rahu Kaal parity with RatingAgent', () => {
  const testScores = [5, 50, 90];
  for (const s of testScores) {
    const canonical = getCanonicalScoreLabel(s, true);
    const rating = getScoreLabel(s, true);
    assertEqual(canonical, rating, `RK parity at score ${s}`);
  }
});

// ── 3. Guidance label mapping ────────────────────────────────────────────────

test('Guidance label: 90 → excellent', () => {
  assertEqual(getGuidanceLabel(90), 'excellent', 'guidance 90');
});

test('Guidance label: 70 → strong', () => {
  assertEqual(getGuidanceLabel(70), 'strong', 'guidance 70');
});

test('Guidance label: 55 → mixed', () => {
  assertEqual(getGuidanceLabel(55), 'mixed', 'guidance 55');
});

test('Guidance label: 47 → caution', () => {
  assertEqual(getGuidanceLabel(47), 'caution', 'guidance 47');
});

test('Guidance label: 40 → delay_if_possible (Difficult tier)', () => {
  assertEqual(getGuidanceLabel(40), 'delay_if_possible', 'guidance 40');
});

test('Guidance label: 20 → delay_if_possible', () => {
  assertEqual(getGuidanceLabel(20), 'delay_if_possible', 'guidance 20');
});

test('Guidance label: Rahu Kaal → delay_if_possible', () => {
  assertEqual(getGuidanceLabel(90, true), 'delay_if_possible', 'guidance RK');
});

// ── 4. Slot guidance builder ─────────────────────────────────────────────────

test('Strong slot: best_for is non-empty', () => {
  const g = buildSlotGuidance({
    score: 82,
    hora_planet: 'Jupiter',
    choghadiya: 'Amrit',
    transit_lagna_house: 9,
    is_rahu_kaal: false,
    display_label: '09:00–10:00',
  });
  assert(g.best_for.length > 0, 'strong slot should have best_for');
  assert(g.avoid_for.length >= 0, 'strong slot avoid_for exists');
  assert(g.summary_plain.includes('09:00–10:00'), 'summary mentions display_label');
  assertEqual(g.label, 'strong', 'label is strong');
});

test('Rahu Kaal slot: avoid initiation, safe for completion', () => {
  const g = buildSlotGuidance({
    score: 60,
    hora_planet: 'Moon',
    choghadiya: 'Shubh',
    transit_lagna_house: 1,
    is_rahu_kaal: true,
    display_label: '15:00–16:00',
  });
  assertIncludes(g.avoid_for, 'starting new projects', 'RK avoids new projects');
  assertIncludes(g.still_ok_for, 'completing existing work', 'RK still ok for completion');
  assert(g.summary_plain.toLowerCase().includes('rahu kaal'), 'summary mentions Rahu Kaal');
  assert(g.if_unavoidable.length > 0, 'if_unavoidable is set for RK');
  assertEqual(g.label, 'delay_if_possible', 'RK label is delay_if_possible');
});

test('Weak slot: has safe use cases', () => {
  const g = buildSlotGuidance({
    score: 25,
    hora_planet: 'Saturn',
    choghadiya: 'Kaal',
    transit_lagna_house: 8,
    is_rahu_kaal: false,
    display_label: '20:00–21:00',
  });
  assert(g.still_ok_for.length > 0, 'weak slot has still_ok_for');
  assert(g.if_unavoidable.length > 0, 'weak slot has if_unavoidable');
  assert(g.summary_plain.includes('weak'), 'summary says weak');
});

test('Category scores are bounded 5-98', () => {
  const g = buildSlotGuidance({
    score: 50,
    hora_planet: 'Mercury',
    choghadiya: 'Labh',
    transit_lagna_house: 2,
    is_rahu_kaal: false,
    display_label: '10:00–11:00',
  });
  for (const [cat, sc] of Object.entries(g.category_scores)) {
    assert(sc >= 5 && sc <= 98, `category ${cat} score ${sc} in range`);
  }
});

test('Reason tags include hora and choghadiya', () => {
  const g = buildSlotGuidance({
    score: 70,
    hora_planet: 'Venus',
    choghadiya: 'Shubh',
    transit_lagna_house: 5,
    is_rahu_kaal: false,
    display_label: '14:00–15:00',
  });
  const codes = g.reason_tags.map((r) => r.code);
  assert(codes.some((c) => c.startsWith('hora_')), 'has hora reason tag');
  assert(codes.some((c) => c.startsWith('chog_')), 'has choghadiya reason tag');
  assert(codes.some((c) => c.startsWith('house_')), 'has house reason tag');
});

// ── 5. Day briefing builder ──────────────────────────────────────────────────

test('Day briefing: top_windows and caution_windows', () => {
  const slots = Array.from({ length: 18 }, (_, i) => ({
    slot_index: i,
    score: i < 3 ? 80 : i > 15 ? 30 : 55,
    is_rahu_kaal: i === 10,
    hora_planet: 'Sun',
    choghadiya: 'Shubh',
    display_label: `${(6 + i).toString().padStart(2, '0')}:00–${(7 + i).toString().padStart(2, '0')}:00`,
  }));

  const b = buildDayBriefing({
    date: '2026-04-12',
    day_score: 55,
    panchang: { nakshatra: 'Rohini', yoga: 'Siddhi', day_ruler: 'Sunday' },
    slots,
  });

  assert(b.top_windows.length === 3, 'has 3 top windows');
  assert(b.caution_windows.length > 0, 'has caution windows');
  assert(b.theme.length > 0, 'has theme');
  assert(b.why_today.length > 0, 'has why_today');
});

// ── 6. Day score invariant ───────────────────────────────────────────────────

test('calculateDayScore throws on non-18 slots', () => {
  let threw = false;
  try {
    calculateDayScore([{ score: 50 }, { score: 60 }]);
  } catch {
    threw = true;
  }
  assert(threw, 'should throw for non-18 slots');
});

test('calculateDayScore returns rounded mean of 18 slots', () => {
  const slots = Array.from({ length: 18 }, (_, i) => ({ score: 40 + i * 2 }));
  const expected = Math.round(slots.reduce((a, b) => a + b.score, 0) / 18);
  assertEqual(calculateDayScore(slots), expected, 'mean of 18 slots');
});

// ── 7. calculateSlotScore sanity ─────────────────────────────────────────────

test('Strong slot score is high', () => {
  const score = calculateSlotScore({
    horaRuler: 'Jupiter',
    lagna: 'Cancer',
    choghadiya: 'Amrit',
    transitHouseMod: 6,
    isRahuKaal: false,
  });
  assert(score >= 75, `strong slot score ${score} >= 75`);
});

test('Rahu Kaal penalty applies', () => {
  const withoutRK = calculateSlotScore({
    horaRuler: 'Moon',
    lagna: 'Cancer',
    choghadiya: 'Shubh',
    transitHouseMod: 0,
    isRahuKaal: false,
  });
  const withRK = calculateSlotScore({
    horaRuler: 'Moon',
    lagna: 'Cancer',
    choghadiya: 'Shubh',
    transitHouseMod: 0,
    isRahuKaal: true,
  });
  assert(withRK < withoutRK, `RK score ${withRK} < non-RK ${withoutRK}`);
});

// ── 8. Structural validation ─────────────────────────────────────────────────

function makeMinimalSlot(index: number): HoraSlot {
  return {
    slot_index: index,
    display_label: `${(6 + index).toString().padStart(2, '0')}:00–${(7 + index).toString().padStart(2, '0')}:00`,
    start_iso: `2026-04-12T${(6 + index).toString().padStart(2, '0')}:00:00+05:30`,
    end_iso: `2026-04-12T${(7 + index).toString().padStart(2, '0')}:00:00+05:30`,
    midpoint_iso: `2026-04-12T${(6 + index).toString().padStart(2, '0')}:30:00+05:30`,
    hora_planet: 'Sun',
    hora_planet_symbol: '☉',
    choghadiya: 'Shubh',
    choghadiya_quality: 'Auspicious',
    is_rahu_kaal: false,
    transit_lagna: 'Aries',
    transit_lagna_house: 1,
    score: 60,
    label: 'Neutral',
    commentary: 'Test commentary text.',
    commentary_short: 'Test short.',
  };
}

function makeMinimalDay(date: string): DayForecast {
  const slots = Array.from({ length: 18 }, (_, i) => makeMinimalSlot(i));
  const mean = Math.round(slots.reduce((a, s) => a + s.score, 0) / 18);
  return {
    date,
    day_label: 'Test Day',
    day_score: mean,
    day_label_tier: 'Neutral',
    day_theme: 'Test theme.',
    overview: 'Test overview text.',
    panchang: { tithi: 'Pratipada', nakshatra: 'Rohini', yoga: 'Siddhi', karana: 'Bava', sunrise: '06:00', sunset: '18:30', moon_sign: 'Cancer', day_ruler: 'Sunday' },
    rahu_kaal: { start: '15:00', end: '16:30' },
    slots,
    peak_count: 0,
    caution_count: 0,
  };
}

function makeMinimalReport(): ReportData {
  return {
    report_id: 'test-1',
    report_type: '7day',
    generated_at: '2026-04-12',
    nativity: {
      natal_chart: {
        lagna: 'Cancer',
        lagna_degree: 15,
        planets: {},
        moon_nakshatra: 'Rohini',
        dasha_sequence: [],
        current_dasha: { mahadasha: 'Mercury', antardasha: 'Venus', start_date: '2026-01-01', end_date: '2028-01-01' },
      },
      lagna_analysis: 'Cancer lagna analysis text.',
      key_yogas: ['Gaja Kesari'],
      functional_benefics: ['Moon', 'Mars', 'Jupiter'],
      functional_malefics: ['Saturn', 'Mercury'],
      current_dasha_interpretation: 'Mercury mahadasha interpretation.',
    },
    months: Array.from({ length: 12 }, (_, i) => ({
      month: `Month ${i + 1}`,
      score: 60,
      overall_score: 60,
      domain_scores: { career: 60, money: 55, health: 65, relationships: 58 },
      theme: 'Test month theme.',
      commentary: 'Test month commentary.',
      key_transits: ['Jupiter in Cancer'],
      weekly_scores: [55, 60, 65, 58],
    })),
    weeks: Array.from({ length: 6 }, (_, i) => ({
      week_label: `Week ${i + 1}`,
      week_start: `2026-04-${(12 + i * 7).toString().padStart(2, '0')}`,
      score: 60,
      theme: 'Test week.',
      commentary: 'Test week commentary.',
      daily_scores: [55, 60, 58, 65, 62, 55, 58],
      moon_journey: ['Cancer', 'Leo', 'Leo', 'Virgo', 'Virgo', 'Libra', 'Libra'],
      peak_days_count: 1,
      caution_days_count: 1,
    })),
    days: [makeMinimalDay('2026-04-12'), makeMinimalDay('2026-04-13'), makeMinimalDay('2026-04-14')],
    synthesis: {
      opening_paragraph: 'Test opening paragraph.',
      strategic_windows: [{ date: '2026-04-12', nakshatra: 'Rohini', score: 80, reason: 'Strong transit support.' }],
      caution_dates: [{ date: '2026-04-14', nakshatra: 'Ardra', score: 35, reason: 'Challenging transit.' }],
      domain_priorities: { career: 'Focus career.', money: 'Watch spending.', health: 'Rest well.', relationships: 'Nurture.' },
      closing_paragraph: 'Test closing.',
    },
  };
}

test('Valid minimal report passes structural validation', () => {
  const report = makeMinimalReport();
  const errors = validateReportData(report);
  assertEqual(errors.length, 0, `errors: ${errors.join('; ')}`);
});

test('Missing nativity.lagna_analysis fails', () => {
  const report = makeMinimalReport();
  report.nativity.lagna_analysis = '';
  const errors = validateReportData(report);
  assert(errors.some((e) => e.includes('lagna_analysis')), 'should report lagna_analysis error');
});

test('Wrong month count fails', () => {
  const report = makeMinimalReport();
  report.months = report.months.slice(0, 6);
  const errors = validateReportData(report);
  assert(errors.some((e) => e.includes('months')), 'should report months error');
});

test('Wrong week count fails', () => {
  const report = makeMinimalReport();
  report.weeks = report.weeks.slice(0, 3);
  const errors = validateReportData(report);
  assert(errors.some((e) => e.includes('weeks')), 'should report weeks error');
});

test('Wrong slot count triggers error', () => {
  const report = makeMinimalReport();
  report.days[0].slots = report.days[0].slots.slice(0, 10);
  const errors = validateReportData(report);
  assert(errors.some((e) => e.includes('18 slots')), 'should report slot count error');
});

// ── 9. Semantic validation ───────────────────────────────────────────────────

test('Semantic: day_score drift triggers warning', () => {
  const report = makeMinimalReport();
  report.days[0].day_score = 90;
  const warnings = validateReportSemantics(report);
  assert(warnings.some((w) => w.includes('day_score')), 'should warn about day_score drift');
});

test('Semantic: label mismatch triggers warning', () => {
  const report = makeMinimalReport();
  report.days[0].slots[0].score = 30;
  report.days[0].slots[0].label = 'Peak';
  const warnings = validateReportSemantics(report);
  assert(warnings.some((w) => w.includes('label')), 'should warn about label mismatch');
});

test('Semantic: identical commentaries trigger fallback warning', () => {
  const report = makeMinimalReport();
  for (const slot of report.days[0].slots) {
    slot.commentary = 'END: EXECUTE THE ONE MOST IMPORTANT TASK.';
  }
  const warnings = validateReportSemantics(report);
  assert(warnings.some((w) => w.includes('fallback')), 'should warn about fallback leakage');
});

// ── 10. Backward compatibility ───────────────────────────────────────────────

test('Old report without guidance_v2 still passes validation', () => {
  const report = makeMinimalReport();
  const errors = validateReportData(report);
  assertEqual(errors.length, 0, 'old report should pass');
});

test('buildSlotGuidance works without panchang', () => {
  const g = buildSlotGuidance({
    score: 65,
    hora_planet: 'Mars',
    choghadiya: 'Labh',
    transit_lagna_house: 10,
    is_rahu_kaal: false,
    display_label: '12:00–13:00',
  });
  assert(g.summary_plain.length > 0, 'summary generated without panchang');
  assert(g.reason_tags.length >= 2, 'reason tags generated');
});

// ── 11. PDF adapter compatibility ────────────────────────────────────────────

test('reportDataToPdfPayload produces valid output', async () => {
  const { reportDataToPdfPayload } = await import('../lib/pdf/reportAdapter');
  const report = makeMinimalReport();
  const payload = reportDataToPdfPayload(report, {
    name: 'Test User',
    date: '1990-01-01',
    time: '12:00',
    city: 'Mumbai',
  });
  assert(payload.name === 'Test User', 'name matches');
  assert(payload.days.length === 3, 'days count matches');
  assert(payload.monthly.length === 12, 'monthly count matches');
  assert(payload.weekly.length === 6, 'weekly count matches');
  for (const day of payload.days) {
    assert(day.slots.length === 18, `day ${day.date} has 18 slots`);
  }
});

// ── 12. End-to-end sample assembly ───────────────────────────────────────────

test('End-to-end: guidance enriched report assembles correctly', () => {
  const slotInputs = Array.from({ length: 18 }, (_, i) => ({
    score: 40 + Math.round(Math.sin(i) * 20 + 20),
    hora_planet: ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'][i % 7],
    choghadiya: ['Amrit', 'Shubh', 'Labh', 'Chal', 'Udveg', 'Rog', 'Kaal'][i % 7],
    transit_lagna_house: (i % 12) + 1,
    is_rahu_kaal: i === 10,
    display_label: `${(6 + i).toString().padStart(2, '0')}:00–${(7 + i).toString().padStart(2, '0')}:00`,
  }));

  const guidances = slotInputs.map((input) => buildSlotGuidance(input));

  for (let i = 0; i < 18; i++) {
    const g = guidances[i];
    assert(g.summary_plain.length > 10, `slot ${i} has meaningful summary`);
    assert(g.reason_tags.length >= 2, `slot ${i} has reason tags`);

    if (slotInputs[i].is_rahu_kaal) {
      assert(g.avoid_for.length > 0, `RK slot ${i} has avoid_for`);
      assert(g.still_ok_for.length > 0, `RK slot ${i} has still_ok_for`);
    }
  }

  const slotsForBriefing = slotInputs.map((input, i) => ({
    slot_index: i,
    score: input.score,
    is_rahu_kaal: input.is_rahu_kaal,
    hora_planet: input.hora_planet,
    choghadiya: input.choghadiya,
    display_label: input.display_label,
    guidance: guidances[i],
  }));

  const briefing = buildDayBriefing({
    date: '2026-04-12',
    day_score: Math.round(slotInputs.reduce((a, s) => a + s.score, 0) / 18),
    panchang: { nakshatra: 'Rohini', yoga: 'Siddhi', day_ruler: 'Sunday' },
    slots: slotsForBriefing,
  });

  assert(briefing.top_windows.length > 0, 'briefing has top_windows');
  assert(briefing.why_today.length > 0, 'briefing has why_today');
  assert(briefing.theme.length > 0, 'briefing has theme');
});

// ── Results ──────────────────────────────────────────────────────────────────

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
if (failures.length > 0) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
process.exit(0);
