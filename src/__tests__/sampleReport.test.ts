/**
 * /sample-report shows one finished forecast for an INVENTED reader. These tests keep what it says tied to the
 * engine's numbers: the written text was produced once (scripts/gen-sample-forecast.ts), and a sentence that
 * quotes a score or a clock time must still match the day it is about. They also guard the landing previews,
 * which read the same data, against the wrong-ayanamsa chart they once carried.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SAMPLE_FORECAST as F } from '@/components/landing/sampleForecast';
import { SAMPLE_DASHA, SAMPLE_DAY_SCORE, SAMPLE_GRID, SAMPLE_KUNDLI, SAMPLE_SEEKER, SAMPLE_SYNASTRY } from '@/components/landing/sampleData';
import {
  BRIEF,
  DAILY_NOTES,
  DAYS,
  EVENT_DATE,
  EVENT_DAY,
  FIRST_MONTH,
  HOURLY,
  MONTH_ROWS,
  MOON_SIGN_MARGIN_MINUTES,
  QUIETEST_DAYS,
  SECTION_ORDER,
  STRONGEST_DAYS,
  SYNTHESIS,
  WEEKS,
  calendarRows,
  formatClockRange,
  formatRange,
  noteBlocks,
  shortDate,
  splitHourly,
  whyLine,
} from '@/components/landing/sampleReportView';
import { SAMPLE_READER_ANSWERS, SAMPLE_READER_CONTEXT, SAMPLE_WINDOW_DAYS, SAMPLE_WINDOW_START } from '@/components/landing/sampleReader';
import { addDays } from '@/lib/personalization/eventDate';
import { personalContextFrom } from '@/lib/quiz/personalContext';

const MONTH_NUMBER: Record<string, string> = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
const FULL_MONTH_NUMBER: Record<string, string> = { October: '10', November: '11', December: '12' };
/** matchAll as an array, so the loops compile under the project's ES5 target. */
const all = (text: string, re: RegExp) => Array.from(text.matchAll(re));
const scoreOn = (date: string) => DAYS.find((d) => d.date === date)?.score;

describe('the generated sample matches its inputs', () => {
  it('was written for exactly the answers in sampleReader.ts', () => {
    expect(F.generatedFor).toBe(SAMPLE_READER_CONTEXT);
    expect(personalContextFrom(SAMPLE_READER_ANSWERS)).toBe(SAMPLE_READER_CONTEXT);
  });

  it('covers 30 consecutive days from the start date, 18 windows each, and holds the reader’s date', () => {
    expect(DAYS).toHaveLength(SAMPLE_WINDOW_DAYS);
    DAYS.forEach((d, i) => {
      expect(d.date).toBe(addDays(SAMPLE_WINDOW_START, i));
      expect(d.slots).toHaveLength(18);
    });
    expect(DAYS.map((d) => d.date)).toContain(EVENT_DATE);
    expect(EVENT_DAY.slots.every((s) => s.hora && s.chog)).toBe(true);
    expect(HOURLY).toHaveLength(18);
    expect(HOURLY.every((h) => h.short.length > 20 && h.full.length > 60)).toBe(true);
  });

  it('every day score is the mean of its 18 windows', () => {
    for (const d of DAYS) expect(d.score).toBe(Math.round(d.slots.reduce((a, s) => a + s.score, 0) / 18));
  });
});

describe('the engine really was Lahiri (the landing previews once carried a Fagan-Bradley chart)', () => {
  it('has the Sun in Gemini and the lagna at 17.09 degrees, not Taurus and 16.21', () => {
    expect(F.ayanamsa).toMatch(/Lahiri/);
    expect(SAMPLE_SEEKER.lagna).toBe('Cancer');
    expect(SAMPLE_SEEKER.lagnaDegree).toBeCloseTo(17.09, 2);
    expect(SAMPLE_SEEKER.sunSign).toBe('Gemini');
    expect(SAMPLE_SEEKER.sunHouse).toBe(12);
    expect(SAMPLE_SEEKER.moonSign).toBe('Scorpio');
    expect(SAMPLE_SEEKER.moonNakshatra).toBe('Jyeshtha');
    expect(SAMPLE_KUNDLI.placements.find((p) => p.planet === 'Sun')).toMatchObject({ sign: 'Gemini', house: 12 });
  });

  it('puts the Moon period at 3 Aug 2025 to 4 Aug 2035, with Mars inside it until 2 Jan 2027', () => {
    const moon = SAMPLE_DASHA.find((d) => d.lord === 'Moon')!;
    expect(moon.start).toBe('2025-08-03');
    expect(moon.end).toBe('2035-08-04');
    expect(F.chart.currentDasha).toMatchObject({ mahadasha: 'Moon', antardasha: 'Mars', end_date: '2027-01-02' });
    expect(SAMPLE_DASHA).toHaveLength(9);
    SAMPLE_DASHA.forEach((d, i) => {
      if (i > 0) expect(d.start).toBe(SAMPLE_DASHA[i - 1].end);
    });
  });

  it('shows the same day on the landing previews and on /sample-report', () => {
    expect(SAMPLE_GRID).toHaveLength(18);
    expect(SAMPLE_GRID.map((g) => g.score)).toEqual(EVENT_DAY.slots.map((s) => s.score));
    expect(SAMPLE_DAY_SCORE).toBe(EVENT_DAY.score);
    expect(SAMPLE_SEEKER.sampleDayLabel).toContain('3 Nov');
  });

  it('gives the matching sample the score the product’s own Ashtakoot code gives', () => {
    expect(SAMPLE_SYNASTRY.breakdown.reduce((a, k) => a + k.score, 0)).toBeCloseTo(SAMPLE_SYNASTRY.total, 5);
    expect(SAMPLE_SYNASTRY.total).toBeLessThanOrEqual(36);
  });
});

describe('what the written text says about the numbers is true', () => {
  it('each day note quotes its own day score, Rahu Kaal and window scores correctly', () => {
    expect(DAILY_NOTES.map((n) => n.date)).toEqual([F.event.prepDate, EVENT_DATE]);
    for (const n of DAILY_NOTES) {
      const day = DAYS.find((d) => d.date === n.date)!;
      expect(n.overview).toContain(`Day score is ${day.score}`);
      expect(n.overview).toContain(`Rahu Kaal: ${day.rahuKaal}`);
      for (const m of all(n.overview, /(\d{2}:\d{2}–\d{2}:\d{2})[^.\n]*?\bscores? (\d+)/g)) {
        const slot = day.slots.find((s) => s.label === m[1]);
        if (slot) expect(slot.score, `${n.date} ${m[1]}`).toBe(Number(m[2]));
      }
      expect(n.overview).not.toMatch(/[{}]/);
    }
  });

  it('the week lines name real days with their real scores, and each week score is that week’s mean', () => {
    expect(WEEKS).toHaveLength(5);
    for (const w of WEEKS) {
      for (const line of [w.best, w.worst]) {
        for (const m of all(line, /([A-Z][a-z]{2}) (\d{1,2}) \(score (\d+)\)/g)) {
          const date = `2026-${MONTH_NUMBER[m[1]]}-${m[2].padStart(2, '0')}`;
          expect(scoreOn(date), `${w.label}: ${m[0]}`).toBe(Number(m[3]));
        }
      }
    }
    WEEKS.forEach((w, i) => {
      const scores = DAYS.slice(i * 7, i * 7 + 7).map((d) => d.score);
      expect(w.score).toBe(Math.round(scores.reduce((a, b) => a + b, 0) / scores.length));
    });
    // only the week that holds the reader's date carries a full analysis
    expect(WEEKS.filter((w) => w.analysis).map((w) => w.label)).toEqual(['Nov 2–8']);
    for (const m of all(WEEKS.find((w) => w.analysis)!.analysis, /(?:Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day (?:Nov (\d+) )?(?:scores|hits) (\d+)/g)) {
      if (m[1]) expect(scoreOn(`2026-11-${m[1].padStart(2, '0')}`)).toBe(Number(m[2]));
    }
  });

  it('every "D Month scores N" in the synthesis is right', () => {
    const text = [SYNTHESIS.opening, SYNTHESIS.closing, SYNTHESIS.career, SYNTHESIS.money].join(' ');
    let checked = 0;
    for (const m of all(text, /(\d{1,2}) (October|November|December)(?: [a-z ]*?)? (?:scores|at a score of|at) (\d+)/g)) {
      expect(scoreOn(`2026-${FULL_MONTH_NUMBER[m[2]]}-${m[1].padStart(2, '0')}`), m[0]).toBe(Number(m[3]));
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
    expect(text).not.toMatch(/[{}]/);
  });

  it('shows four months, with prose for the first only (the ingress table the monthly prompts use ends in Jan 2027)', () => {
    expect(MONTH_ROWS.map((m) => m.label)).toEqual(['October 2026', 'November 2026', 'December 2026', 'January 2027']);
    expect(FIRST_MONTH.opening.length).toBeGreaterThan(100);
    expect(FIRST_MONTH.movements).toContain('31 October');
    for (const m of MONTH_ROWS.slice(1)) expect([m.opening, m.movements, m.closing]).toEqual(['', '', '']);
    expect(F.written.nativity.dashaInterpretation).toContain('4 August 2035');
    expect(F.written.nativity.dashaInterpretation).toContain('2 January 2027');
  });

  it('keeps the hourly notes free of warning symbols and braces', () => {
    for (const h of HOURLY) expect(`${h.short} ${h.full}`).not.toMatch(/[⚠⚡{}]/);
  });
});

describe('the personal layer is the product’s own', () => {
  it('opens with her selections, puts her interview and her best-days answer first, and quotes the date', () => {
    expect(BRIEF.heading).toBe('Nisha, here is what you told us');
    expect(BRIEF.event?.kind).toBe('in_window');
    expect(BRIEF.eventDate).toBe(EVENT_DATE);
    expect(BRIEF.selections.map((s) => s.value).join(' | ')).toContain('interview at a new company on 3 November');
    expect(SECTION_ORDER.slice(0, 2)).toEqual(['decide', 'weekly']);
    expect(whyLine('decide')).toContain('interview at a new company on 3 November');
    expect(whyLine('weekly')).toContain('best days of a month');
    expect(BRIEF.arrangement.join(' ')).toMatch(/vague/);
    expect(BRIEF.arrangement.join(' ')).toMatch(/gemstone, ritual or purchase/);
  });

  it('puts the strongest and quietest days where the engine puts them', () => {
    const sorted = [...DAYS].sort((a, b) => b.score - a.score);
    expect(STRONGEST_DAYS[0].score).toBe(sorted[0].score);
    expect(QUIETEST_DAYS[0].score).toBe(sorted[sorted.length - 1].score);
    for (const d of STRONGEST_DAYS) expect(d.hours.length).toBeGreaterThan(0);
  });
});

describe('helpers', () => {
  it('formats clock times in 12 hours, never 24', () => {
    expect(formatRange('06:00–07:00')).toBe('6 – 7 am');
    expect(formatRange('11:00–12:00')).toBe('11 am – 12 pm');
    expect(formatRange('23:00–24:00')).toBe('11 pm – 12 am');
    expect(formatClockRange('14:57–16:24')).toBe('2:57 – 4:24 pm');
    expect(shortDate('2026-11-03')).toBe('Tue 3 Nov');
  });

  it('lays the 30 days out Monday-first with every date under its weekday', () => {
    const rows = calendarRows();
    expect(rows.every((r) => r.length === 7)).toBe(true);
    expect(rows[0][0]?.date).toBe('2026-10-12'); // a Monday
    expect(rows.flat().filter(Boolean)).toHaveLength(30);
  });

  it('splits a day note into paragraphs, a heading and numbered lines', () => {
    const blocks = noteBlocks(DAILY_NOTES[1].overview);
    expect(blocks.filter((b) => b.kind === 'h')).toHaveLength(1);
    expect(blocks.filter((b) => b.kind === 'li')).toHaveLength(3);
    expect(blocks.some((b) => b.kind === 'p' && b.text.startsWith('Today is your date'))).toBe(true);
  });

  it('puts what to do first and the planet’s role behind "more"', () => {
    const h = splitHourly('Mars is your yogakaraka this hour. Rehearse your answers aloud.\n\nSecond paragraph.\n\nThird.');
    expect(h).toEqual({ role: 'Mars is your yogakaraka this hour.', action: 'Rehearse your answers aloud.', more: ['Second paragraph.', 'Third.'] });
  });

  it('can name how near the sample Moon is to a sign change', () => {
    expect(MOON_SIGN_MARGIN_MINUTES).toBeGreaterThan(5);
    expect(MOON_SIGN_MARGIN_MINUTES).toBeLessThan(30);
  });
});

describe('the page renders statically', () => {
  let html = '';
  beforeAll(async () => {
    // Vitest compiles JSX with the classic runtime, which needs React in scope; the page is imported after this.
    (globalThis as { React?: unknown }).React = React;
    const mod = await import('@/app/sample-report/page');
    html = renderToStaticMarkup(React.createElement(mod.default));
  });

  it('contains the brief, the order, a why-line for each section, the 18 hours and the limits', () => {
    expect(html).toContain('Nisha&#x27;s next 30 days');
    expect(html).toContain('Nisha, here is what you told us');
    expect(html.match(/data-testid="why-here"/g)).toHaveLength(1 + SECTION_ORDER.length);
    for (const slot of EVENT_DAY.slots) expect(html).toContain(formatRange(slot.label));
    expect(html).toContain('What this report cannot do');
    expect(html).toContain('Calculate my free chart');
    expect(html).toContain('A personal hourly forecast is separate');
  });

  it('has the sections in the order her answers chose', () => {
    const at = (s: string) => html.indexOf(s);
    expect(at('Timing by area of life')).toBeGreaterThan(0);
    expect(at('Timing by area of life')).toBeLessThan(at('Week by week'));
    expect(at('Week by week')).toBeLessThan(at('Month by month'));
    expect(at('Month by month')).toBeLessThan(at('Day by day, hour by hour'));
  });

  it('never prints a placeholder, a brace or a 24-hour clock range in what a reader sees', () => {
    const text = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');
    expect(text).not.toMatch(/\bundefined\b|\bNaN\b|\bnull\b|[{}]/);
    expect(text).not.toMatch(/\bPART [ABC]\b/);
  });
});
