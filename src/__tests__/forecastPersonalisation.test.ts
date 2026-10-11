import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as dailyPOST } from '@/app/api/commentary/daily-overviews/route';
import { POST as hourlyPOST } from '@/app/api/commentary/hourly-batch/route';
import { POST as weeksPOST } from '@/app/api/commentary/weeks-synthesis/route';
import { POST as answerPOST } from '@/app/api/reports/[id]/personalized/route';
import { START_FIXTURES } from '@/lib/personalization/fixtures';
import { personalContextFrom } from '@/lib/quiz/personalContext';
import { parseSeekerProfile } from '@/lib/personalization/parse';
import {
  applyReaderTone,
  stripJsonDebris,
  calmen,
  concreteDayLine,
  dayPersonalNote,
  eventDayLine,
  forecastDirectives,
  scrubRemedies,
  seekerPromptBlock,
  stripPartLabels,
} from '@/lib/personalization/forecastPrompt';
import {
  buildEventView,
  buildForecastBrief,
  forecastOrder,
  forecastWhy,
  personalizationStamp,
  type DayView,
  type MonthView,
} from '@/lib/personalization/forecastView';
import { addDays } from '@/lib/personalization/eventDate';

// Invented people only — this repository is public. One chart (the report data below is the same for
// everyone); only the quiz answers differ.

const mockState = vi.hoisted(() => ({
  llm: (async () => '{}') as (a: { systemPrompt: string; userPrompt: string }) => Promise<string>,
  calls: [] as { systemPrompt: string; userPrompt: string }[],
  row: {} as Record<string, unknown>,
}));

vi.mock('@/lib/api/requireAuth', () => ({
  requireAuth: vi.fn(async () => ({ user: { id: 'owner', email: 'o@example.test' }, isAdmin: false })),
}));
vi.mock('@/lib/api/rateLimit', () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true, resetAt: 0 })),
  getRateLimitKey: vi.fn(() => 'k'),
  RATE_LIMITS: { ask: { limit: 10, windowMs: 60_000 }, commentary: { limit: 100, windowMs: 60_000 } },
  shouldRateLimitLlmForUser: () => false,
}));
vi.mock('@/lib/llm/routeCompletion', () => ({
  hasLlmCredentials: () => true,
  completeLlmChat: vi.fn(async (a: { systemPrompt: string; userPrompt: string }) => {
    mockState.calls.push({ systemPrompt: a.systemPrompt, userPrompt: a.userPrompt });
    return mockState.llm(a);
  }),
}));
vi.mock('@/lib/supabase/admin', () => ({
  createServiceClient: () => ({
    from: () => {
      const q = {
        select: () => q,
        eq: () => q,
        maybeSingle: async () => ({ data: mockState.row, error: null }),
        update: () => q,
        then: (resolve: (v: { error: null }) => unknown) => Promise.resolve(resolve({ error: null })),
      };
      return q;
    },
  }),
}));

const START = '2026-10-25';
const dates = (n: number, from = START) => Array.from({ length: n }, (_, i) => addDays(from, i));

function dayBody(date: string) {
  return {
    date,
    panchang: { tithi: 'Shukla Panchami', nakshatra: 'Pushya', yoga: 'Siddhi', moon_sign: 'Cancer' },
    planet_positions: undefined,
    slots: [{ display_label: '09:00–10:00', score: 82, dominant_choghadiya: 'Amrit' }],
    day_score: 66,
    rahu_kaal: { start: '13:43:00', end: '15:07:00' },
    peak_slots: [{ display_label: '09:00–10:00', dominant_hora: 'Jupiter', dominant_choghadiya: 'Amrit', score: 82 }],
  };
}

const MODEL_OVERVIEW =
  '⚠⚠ A steady day for ordinary work. Avoid starting anything new in the afternoon. For grounding, chant a mantra or buy a protective gemstone. Your best move is to finish what is open.';

function req(url: string, body: unknown) {
  return new NextRequest(`https://example.test${url}`, { method: 'POST', body: JSON.stringify(body) });
}

async function daily(personal: string, n = 20) {
  mockState.calls.length = 0;
  mockState.llm = async (a) => {
    const asked = JSON.parse(a.userPrompt.slice(a.userPrompt.indexOf('Days data:') + 'Days data:'.length, a.userPrompt.indexOf('MANDATORY RULES')).trim()) as { date: string }[];
    return JSON.stringify({ days: asked.map((d) => ({ date: d.date, day_theme: '⚠ A steady day', day_overview: MODEL_OVERVIEW })) });
  };
  const res = await dailyPOST(req('/api/commentary/daily-overviews', { lagnaSign: 'Aquarius', mahadasha: 'Jupiter', antardasha: 'Rahu', personal_context: personal, days: dates(n).map(dayBody) }));
  const json = (await res.json()) as { days: { date: string; day_theme: string; day_overview: string }[] };
  return { json, system: mockState.calls[0].systemPrompt, user: mockState.calls.map((c) => c.userPrompt).join('\n') };
}

describe('daily overviews: same chart, different answers', () => {
  it('tells the writer what each person said, and what to do about it', async () => {
    const asha = await daily(START_FIXTURES.asha);
    const meera = await daily(START_FIXTURES.meera);
    const rohan = await daily(START_FIXTURES.rohan);
    const nobody = await daily('');

    expect(asha.system).toContain('ABOUT THE READER');
    expect(asha.system).toContain('“interview at a new company on 12 November” (12 November 2026)');
    expect(asha.system).toContain('too vague');
    expect(asha.system).toContain('mention no gemstone');
    expect(asha.system).toContain('thinking of changing jobs');
    expect(asha.system).toContain('tie the day\'s best move to work and money');

    expect(meera.system).toContain('Do not use the words avoid, warning, bad');
    expect(meera.system).toContain('Health and energy');
    expect(meera.system).not.toContain('interview');

    expect(rohan.system).toContain('never consulted an astrologer');
    expect(rohan.system).toContain('The reader plans by the hour');
    expect(rohan.system).toContain('Kavya');

    expect(nobody.system).not.toContain('HOW TO WRITE FOR THIS READER');
    expect(new Set([asha.system, meera.system, rohan.system, nobody.system]).size).toBe(4);
  });

  it('marks the days around the reader’s own date, and only those', async () => {
    const asha = await daily(START_FIXTURES.asha, 30);
    const notes = asha.user.split('\n').filter((l) => l.startsWith('PERSONAL NOTE'));
    expect(notes.some((n) => n.includes('this day IS'))).toBe(true);
    expect(notes.some((n) => n.includes('1 day before'))).toBe(true);
    expect(notes.some((n) => n.includes('7 days before'))).toBe(true);
    expect(notes.some((n) => n.includes('1 day after'))).toBe(true);
    expect(notes.length).toBe(10); // 7 before, the day, 2 after
    expect(notes.every((n) => n.includes('interview at a new company on 12 November'))).toBe(true);
    // Nobody with a date: no notes at all.
    expect((await daily(START_FIXTURES.meera, 30)).user).not.toContain('PERSONAL NOTE');
  });

  it('puts the reader’s date on its own day and one concrete window on every day, for someone who found astrology vague', async () => {
    const asha = await daily(START_FIXTURES.asha, 30);
    const onDay = asha.json.days.find((d) => d.date === '2026-11-12')!;
    expect(onDay.day_overview).toContain('Today is your date: interview at a new company on 12 November. Your strongest window for it is 09:00–10:00.');
    const other = asha.json.days.find((d) => d.date === '2026-11-01')!;
    expect(other.day_overview).not.toContain('Today is your date');
    for (const d of asha.json.days) expect(d.day_overview, d.date).toContain('Put work and money in 09:00–10:00 (Jupiter hour), and keep 13:43–15:07 for routine tasks.');
  });

  it('drops remedy-selling for someone tired of pressure, and alarm words for someone who asked for calm', async () => {
    const asha = (await daily(START_FIXTURES.asha)).json.days[0];
    expect(asha.day_overview).not.toMatch(/mantra|gemstone/i);
    expect(asha.day_overview).toContain('Your best move is to finish what is open.');

    const meera = (await daily(START_FIXTURES.meera)).json.days[0];
    expect(meera.day_overview).not.toMatch(/⚠|\bavoid\b/i);
    expect(meera.day_overview).toContain('Hold off on starting anything new in the afternoon');
    expect(meera.day_theme).not.toContain('⚠');
  });

  it('leaves the text of a reader with no such wishes exactly as the model wrote it', async () => {
    const rohan = (await daily(START_FIXTURES.rohan)).json.days[0];
    expect(rohan.day_overview).toBe(MODEL_OVERVIEW);
    const nobody = (await daily('')).json.days[0];
    expect(nobody.day_overview).toBe(MODEL_OVERVIEW);
  });

  it('keeps the older free-text question working: an unrecognised note still reaches the model, as before', async () => {
    const legacy = await daily('When will I finally get a job offer in Dubai?');
    expect(legacy.system).toContain('ABOUT THE SEEKER, IN THEIR OWN WORDS');
    expect(legacy.system).toContain('When will I finally get a job offer in Dubai?');
    expect(legacy.system).not.toContain('HOW TO WRITE FOR THIS READER');
  });
});

describe('hourly commentary', () => {
  const SLOT_TEXT =
    'RAHU KAAL — finish what is open, and avoid new commitments here. The hour carries steady Saturn energy for routine tasks and review, which is what suits it best today.\n\nTransit lagna Libra is active.\n\n⚠⚠ KAAL window — absolutely avoid starting anything.';
  async function hourly(personal: string) {
    mockState.calls.length = 0;
    mockState.llm = async () =>
      JSON.stringify({ days: [{ dayIndex: 0, date: '2026-11-12', slots: Array.from({ length: 18 }, (_, i) => ({ slot_index: i, commentary: SLOT_TEXT })) }] });
    const slots = Array.from({ length: 18 }, (_, i) => ({ slot_index: i, display_label: `${String(6 + i).padStart(2, '0')}:00–${String(7 + i).padStart(2, '0')}:00`, dominant_hora: 'Saturn', dominant_choghadiya: 'Chal', transit_lagna: 'Libra', transit_lagna_house: 9, is_rahu_kaal: false, score: 50 }));
    const res = await hourlyPOST(req('/api/commentary/hourly-batch', { lagnaSign: 'Aquarius', mahadasha: 'Jupiter', antardasha: 'Rahu', personal_context: personal, days: [{ dayIndex: 0, date: '2026-11-12', panchang: { yoga: 'Siddhi' }, slots }] }));
    const json = (await res.json()) as { days: { slots: { commentary: string }[] }[] };
    return { json, system: mockState.calls[0].systemPrompt, user: mockState.calls[0].userPrompt };
  }

  it('picks example activities from the reader’s own area, and notes their date on the day', async () => {
    const asha = await hourly(START_FIXTURES.asha);
    expect(asha.system).toContain('interviews, negotiations, asking for a review');
    expect(asha.user).toContain('PERSONAL NOTE: this day IS the reader\'s date ("interview at a new company on 12 November"');
    const rohan = await hourly(START_FIXTURES.rohan);
    expect(rohan.system).toContain('an honest conversation, planning time together');
    expect(rohan.system).not.toContain('interviews, negotiations');
    expect(rohan.user).not.toContain('PERSONAL NOTE');
    const nobody = await hourly('');
    expect(nobody.system).not.toContain('ABOUT THE READER');
  });

  it('applies the reader’s tone to every hour', async () => {
    const meera = await hourly(START_FIXTURES.meera);
    for (const s of meera.json.days[0].slots) expect(s.commentary).not.toMatch(/⚠|\bavoid\b/i);
    const nobody = await hourly('');
    expect(nobody.json.days[0].slots[0].commentary).toContain('absolutely avoid');
  });
});

describe('weeks synthesis', () => {
  it('asks for a window around the reader’s date and puts the most words on their area', async () => {
    mockState.calls.length = 0;
    mockState.llm = async () =>
      JSON.stringify({
        weeks: [{ week_label: 'Oct 25–31', overall_score: 60, theme: 'Steady', analysis: 'A steady week. Avoid rushing.' }],
        period_synthesis: { opening_paragraph: 'word '.repeat(80) + 'Consider a puja this week.', strategic_windows: [{ date: '2026-11-03', score: 70, reason: 'Strong. Buy a gemstone.' }], caution_dates: [], domain_priorities: { career: 'Avoid big changes.' }, closing_paragraph: 'Go steady.' },
      });
    const res = await weeksPOST(
      req('/api/commentary/weeks-synthesis', {
        lagnaSign: 'Aquarius', mahadasha: 'Jupiter', antardasha: 'Rahu', reportStartDate: START, personal_context: START_FIXTURES.asha,
        weeks: [{ week_label: 'Oct 25–31', start_date: START, end_date: '2026-10-31', daily_scores: [60, 61, 62, 63, 64, 65, 66] }],
        synthesis_context: { total_days: 30, best_date: '2026-11-03', best_score: 70, worst_date: '2026-11-08', worst_score: 33, avg_score: 55 },
      }),
    );
    const json = (await res.json()) as { period_synthesis: { opening_paragraph: string; strategic_windows: { reason: string }[]; domain_priorities: { career: string } } };
    const sys = mockState.calls[0].systemPrompt;
    expect(sys).toContain('One strategic_windows or caution_dates entry must be about the days around it');
    expect(sys).toContain('2026-11-12');
    expect(sys).toContain('(work and money)');
    expect(json.period_synthesis.opening_paragraph).not.toMatch(/puja/i);
    expect(json.period_synthesis.strategic_windows[0].reason).not.toMatch(/gemstone/i);
  });
});

describe('the personalised answer card', () => {
  beforeEach(() => {
    mockState.calls.length = 0;
    mockState.llm = async () => JSON.stringify({ question_echo: 'You are weighing a move.', full_answer: 'A long enough answer that is persisted and shown to the paying reader, with timing.', key_windows: ['Mid-November'] });
  });

  it('asks the question the way the reader would, and hands the model the engine’s read of their date', async () => {
    const days = dates(30).map((d, i) => ({
      date: d, day_score: 50 + (i % 20), rahu_kaal: { start: '13:43:00', end: '15:07:00' },
      slots: Array.from({ length: 18 }, (_, k) => ({ display_label: `${String(6 + k).padStart(2, '0')}:00–${String(7 + k).padStart(2, '0')}:00`, score: 40 + ((k * 7 + i) % 50), is_rahu_kaal: k === 7 || k === 8 })),
    }));
    mockState.row = { user_id: 'owner', payment_status: 'paid', personal_context: START_FIXTURES.asha, lagna_sign: 'Aquarius', moon_sign: 'Aquarius', dasha_mahadasha: 'Jupiter', dasha_antardasha: 'Rahu', native_name: 'Asha Verma', report_data: { days, months: [] } };
    const res = await answerPOST(new NextRequest('https://example.test/api/reports/r1/personalized', { method: 'POST' }), { params: { id: 'r1' } });
    expect(res.status).toBe(200);
    const c = mockState.calls[0];
    expect(c.userPrompt).toContain('Asha asked: "Work and money: I am thinking of changing jobs; on my mind for years; coming up: interview at a new company on 12 November (12 November 2026)."');
    expect(c.userPrompt).toContain("The reader's date (interview at a new company on 12 November) is 2026-11-12: day score");
    expect(c.systemPrompt).toContain('HOW TO WRITE FOR THIS READER');
  });
});

describe('directives and tone helpers', () => {
  const asha = parseSeekerProfile(START_FIXTURES.asha);
  const meera = parseSeekerProfile(START_FIXTURES.meera);

  it('every scope has its own lines for a reader with answers', () => {
    const lines = (scope: Parameters<typeof forecastDirectives>[1]) => forecastDirectives(asha, scope, '2026-11-12').join('\n');
    expect(lines('daily')).toContain('PART C');
    expect(lines('hourly')).toContain('example activities');
    expect(lines('months')).toContain('2026-11-12');
    expect(lines('weeks')).toContain('strategic_windows');
    expect(lines('nativity')).toContain('major period');
    expect(lines('answer')).toContain('windows in the report facts');
  });

  it('scrubs whole remedy sentences, softens alarm words, and changes nothing else', () => {
    expect(scrubRemedies('Keep calm. Wear a gemstone daily. Rest well.')).toBe('Keep calm. Rest well.');
    expect(calmen('Avoid signing. ⚠⚠ Absolutely avoid risky deals; a warning.')).toBe('Hold off on signing. Hold off on delicate deals; a note.');
    expect(applyReaderTone(START_FIXTURES.rohan, 'Avoid it. Chant a mantra.')).toBe('Avoid it. Chant a mantra.');
    expect(applyReaderTone('', '')).toBe('');
  });

  it('removes a stray closing brace a model left inside a day note, for every reader', () => {
    const note = 'Spend 50 minutes on one document, then stop.}\n\nKeep 07:39–09:08 for routine tasks.';
    expect(stripJsonDebris(note)).toBe('Spend 50 minutes on one document, then stop.\n\nKeep 07:39–09:08 for routine tasks.');
    expect(applyReaderTone('', note)).not.toMatch(/[{}]/);
    expect(applyReaderTone(START_FIXTURES.asha, note)).not.toMatch(/[{}]/);
    // Text without braces is returned exactly as written.
    expect(applyReaderTone('', 'Nothing to fix here.')).toBe('Nothing to fix here.');
  });

  it('notes only the days within a week before and two after the date', () => {
    const note = (d: string) => dayPersonalNote(START_FIXTURES.asha, d, { today: START });
    expect(note('2026-11-12')).toContain('IS the reader');
    expect(note('2026-11-05')).toContain('7 days before');
    expect(note('2026-11-04')).toBeNull();
    expect(note('2026-11-14')).toContain('2 days after');
    expect(note('2026-11-15')).toBeNull();
    expect(dayPersonalNote(START_FIXTURES.meera, '2026-11-12', { today: START })).toBeNull();
  });

  it('builds the concrete line from the day’s own windows, and says nothing for a reader who did not ask', () => {
    const day = { peak_slots: [{ display_label: '09:00–10:00', dominant_hora: 'Jupiter' }], rahu_kaal: { start: '13:43:00', end: '15:07:00' } };
    expect(concreteDayLine(START_FIXTURES.asha, day)).toBe('Put work and money in 09:00–10:00 (Jupiter hour), and keep 13:43–15:07 for routine tasks.');
    expect(concreteDayLine(START_FIXTURES.rohan, day)).toBe('');
    expect(eventDayLine(START_FIXTURES.asha, { date: '2026-11-12', peak_slots: day.peak_slots }, { today: START })).toContain('Today is your date');
    expect(eventDayLine(START_FIXTURES.asha, { date: '2026-11-11', peak_slots: day.peak_slots }, { today: START })).toBe('');
  });

  it('never recommends a window that runs into Rahu Kaal', () => {
    const day = {
      peak_slots: [
        { display_label: '13:00–14:00', dominant_hora: 'Mars' },
        { display_label: '16:00–17:00', dominant_hora: 'Jupiter' },
      ],
      rahu_kaal: { start: '13:43:00', end: '15:07:00' },
    };
    expect(concreteDayLine(START_FIXTURES.asha, day)).toContain('Put work and money in 16:00–17:00 (Jupiter hour)');
    expect(concreteDayLine(START_FIXTURES.asha, { peak_slots: [{ display_label: '14:00–15:00' }], rahu_kaal: day.rahu_kaal })).toBe('Keep 13:43–15:07 for routine tasks.');
    expect(eventDayLine(START_FIXTURES.asha, { date: '2026-11-12', peak_slots: day.peak_slots, rahu_kaal: day.rahu_kaal }, { today: START })).toContain('strongest window for it is 16:00–17:00');
  });

  it('picks the strongest clean window, and strips the PART labels the daily prompt asks for', () => {
    const day = { peak_slots: [{ display_label: '09:00–10:00', dominant_hora: 'Saturn', score: 86 }, { display_label: '20:00–21:00', dominant_hora: 'Venus', score: 87 }], rahu_kaal: { start: '10:52:00', end: '12:18:00' } };
    expect(concreteDayLine(START_FIXTURES.asha, day)).toContain('Put work and money in 20:00–21:00 (Venus hour)');
    const nl = String.fromCharCode(10);
    expect(stripPartLabels(['Intro.', '', 'PART C: You said health matters.', 'PART B — YOUR STRATEGY: Best window 09:00.'].join(nl))).toBe(['Intro.', '', 'You said health matters.', 'Best window 09:00.'].join(nl));
    expect(stripPartLabels('Nothing to strip here. Part of the plan.')).toBe('Nothing to strip here. Part of the plan.');
  });

  it('is empty-safe', () => {
    expect(seekerPromptBlock('', 'daily')).toBe('');
    expect(seekerPromptBlock(undefined, 'hourly')).toBe('');
    expect(asha.labels.concern).toBe('Work and money');
    expect(meera.timeConfidence).toBe('unknown');
  });
});

describe('the paid report page’s personal layer', () => {
  const mkDays = (from: string, n: number): DayView[] =>
    dates(n, from).map((date, i) => ({
      date,
      score: 40 + ((i * 13) % 45),
      rahuKaal: '13:43–15:07',
      slots: Array.from({ length: 18 }, (_, k) => ({ label: `${String(6 + k).padStart(2, '0')}:00–${String(7 + k).padStart(2, '0')}:00`, score: 30 + ((k * 11 + i * 5) % 60), rahuKaal: k === 7 || k === 8 })),
    }));
  const months: MonthView[] = [{ month: 'October 2026', score: 61, theme: 'Steady build' }, { month: 'November 2026', score: 68, theme: 'Doors open at work' }];

  it('one set of days, three readers: three different briefs, orders and event cards', () => {
    const days = mkDays('2026-10-25', 30);
    const asha = buildForecastBrief({ personalContext: START_FIXTURES.asha, name: 'Asha Verma', days, months, lagna: 'Aquarius' })!;
    const rohan = buildForecastBrief({ personalContext: START_FIXTURES.rohan, name: 'Rohan Iyer', days, months, lagna: 'Aquarius' })!;
    const meera = buildForecastBrief({ personalContext: START_FIXTURES.meera, name: 'Meera Nair', days, months, lagna: 'Aquarius' })!;
    const nobody = buildForecastBrief({ personalContext: '', name: 'Sam', days, months });

    expect(nobody).toBeNull();
    expect(asha.heading).toBe('Asha, here is what you told us');
    expect(asha.order.order.slice(0, 2)).toEqual(['decide', 'monthly']);
    expect(rohan.order.order[0]).toBe('decide'); // a decision "soon"
    expect(rohan.order.order[1]).toBe('daily'); // plans by the hour
    expect(meera.order.order[0]).toBe('weekly'); // plans by the day, nothing coming up
    expect(new Set([asha, rohan, meera].map((b) => b.order.order.join('>'))).size).toBe(3);

    // The window around Asha's date, from the report's own days.
    expect(asha.event?.kind).toBe('in_window');
    if (asha.event?.kind === 'in_window') {
      expect(asha.event.date).toBe('2026-11-12');
      expect(asha.event.bestHours).toHaveLength(3);
      expect(asha.event.around).toHaveLength(6);
      const prep = asha.event.prepDay?.date ?? '';
      expect(prep >= '2026-11-05' && prep < '2026-11-12').toBe(true);
    }
    // Rohan has a decision but no date: the three strongest days to pick from.
    expect(rohan.event?.kind).toBe('undated');
    if (rohan.event?.kind === 'undated') expect(rohan.event.best).toHaveLength(3);
    // Meera has nothing coming up: no card.
    expect(meera.event).toBeNull();
  });

  it('says how far the scores can be trusted when the birth time is not known or only approximate', () => {
    const days = mkDays('2026-10-25', 30);
    const meera = buildForecastBrief({ personalContext: START_FIXTURES.meera, days, months, lagna: 'Aquarius' })!;
    expect(meera.timeNote).toContain('not known');
    expect(meera.timeNote).toContain('estimated from a noon chart');
    expect(meera.timeNote).toContain('Aquarius');
    const rohan = buildForecastBrief({ personalContext: START_FIXTURES.rohan, days, months })!;
    expect(rohan.timeNote).toContain('approximate');
    const asha = buildForecastBrief({ personalContext: START_FIXTURES.asha, days, months })!;
    expect(asha.timeNote).toBeNull();
  });

  it('a date past the 30 days names its month instead of inventing hours; a date before the start says so', () => {
    const early = buildForecastBrief({ personalContext: START_FIXTURES.asha, days: mkDays('2026-10-11', 30), months })!;
    expect(early.event).toMatchObject({ kind: 'beyond', month: 'November 2026', monthScore: 68, theme: 'Doors open at work' });
    const gone = personalContextFrom({ concern: 'career', has_event: 'yes', event_what: 'exam on 2026-10-01' });
    const late = buildForecastBrief({ personalContext: gone, days: mkDays('2026-10-25', 30), months })!;
    expect(late.event?.kind).toBe('past');
  });

  it('claims about how the text was written appear only when the report was written that way', () => {
    const days = mkDays('2026-10-25', 30);
    const stamp = personalizationStamp(START_FIXTURES.asha, '2026-10-25');
    expect(stamp).toEqual({ v: 1, concrete: true, calm: false, noSales: true, eventDate: '2026-11-12' });
    const withStamp = buildForecastBrief({ personalContext: START_FIXTURES.asha, days, months, stamp })!;
    expect(withStamp.arrangement.join(' ')).toContain('Each daily note ends with one specific window');
    expect(withStamp.arrangement.join(' ')).toContain('Nothing in this forecast suggests a gemstone');
    const withoutStamp = buildForecastBrief({ personalContext: START_FIXTURES.asha, days, months, stamp: null })!;
    expect(withoutStamp.arrangement.join(' ')).not.toContain('Each daily note');
    expect(withoutStamp.arrangement.join(' ')).not.toContain('gemstone');
    // The order and the date card are the page's own doing, so they are always stated.
    expect(withoutStamp.arrangement.join(' ')).toContain('is near the top because');
    expect(withoutStamp.arrangement.join(' ')).toContain('have their own card below');
  });

  it('gives every section a line naming the answer behind it', () => {
    const p = parseSeekerProfile(START_FIXTURES.asha);
    const o = forecastOrder(p);
    const ctx = { profile: p, moved: o.moved, eventDate: '2026-11-12', stamp: personalizationStamp(START_FIXTURES.asha, START) };
    expect(forecastWhy('answer', ctx)).toContain('Work and money');
    expect(forecastWhy('decide', ctx)).toContain('interview at a new company on 12 November');
    expect(forecastWhy('monthly', ctx)).toContain('best months of a year');
    expect(forecastWhy('daily', ctx)).toContain('specific window');
    expect(forecastWhy('synthesis', ctx)).toContain('interview at a new company on 12 November');
    const m = parseSeekerProfile(START_FIXTURES.meera);
    expect(forecastWhy('chart', { profile: m, moved: {}, eventDate: null, stamp: null })).toContain('not known');
    expect(forecastWhy('monthly', { profile: m, moved: {}, eventDate: null, stamp: null })).toContain('on your mind this long');
    const r = parseSeekerProfile(START_FIXTURES.rohan);
    expect(forecastWhy('monthly', { profile: r, moved: {}, eventDate: null, stamp: null })).toContain('sets the background');
  });

  it('a reader who gave no date gets no event card, and the card is built from the report’s days alone', () => {
    const p = parseSeekerProfile(START_FIXTURES.meera);
    expect(buildEventView(p, mkDays('2026-10-25', 5), [])).toBeNull();
    expect(buildEventView(parseSeekerProfile(START_FIXTURES.asha), [], [])).toBeNull();
  });
});
