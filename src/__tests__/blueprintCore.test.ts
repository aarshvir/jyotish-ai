import { describe, it, expect } from 'vitest';
import type { NatalChartData } from '@/lib/agents/types';
import { buildBlueprintFacts, aspectsOnSign } from '@/lib/blueprint/facts';
import { analyzeTimeSensitivity, sensitivityParagraphs } from '@/lib/blueprint/sensitivity';
import { computeNodalWindows, interpolateDays, natalPoints, pickWindows, type NodeSample } from '@/lib/blueprint/transits';
import { bannedHits, ungrounded } from '@/lib/blueprint/lint';
import { closeBrackets, parseModelJson } from '@/lib/blueprint/json';
import { shiftLocal, samplesFromGrid, weeklyDates, dashaOn } from '@/lib/blueprint/generate';
import * as library from '@/lib/blueprint/library';
import { costUsd, MODEL_PRICES } from '@/lib/llm/cost';
import { SIGNS, type Sign } from '@/lib/funnel/reveal/astro';
import { CHART, fakeGrid } from './helpers/blueprintFakes';

// Invented chart only — this repository is public.

describe('facts from the engine chart', () => {
  const f = buildBlueprintFacts({ chart: CHART, timeConfidence: 'exact', today: '2026-10-11' });

  it('counts whole-sign houses from the rising sign', () => {
    expect(f.reference).toBe('lagna');
    expect(f.referenceSign).toBe('Aquarius');
    expect(f.ketu).toMatchObject({ sign: 'Cancer', house: 6 });
    expect(f.rahu).toMatchObject({ sign: 'Capricorn', house: 12 });
    expect(f.houses[9].sign).toBe('Scorpio'); // 10th from Aquarius
    expect(f.houses[9].lord).toBe('Mars');
  });

  it('finds who shares and who aspects a node’s sign', () => {
    expect(f.ketu.conj).toEqual(['Jupiter']);
    expect(f.ketu.aspectedBy).toContain('Saturn'); // Saturn sees the 7th from Capricorn
    expect(f.rahu.conj).toEqual(['Saturn']);
    expect(f.rahu.aspectedBy).toContain('Jupiter'); // Jupiter in Cancer sees its 7th, Capricorn
  });

  it('graha drishti: Mars 4/7/8, Jupiter 5/7/9, Saturn 3/7/10', () => {
    const planets = f.planets;
    // Saturn in Capricorn aspects Pisces (3rd), Cancer (7th), Libra (10th).
    expect(aspectsOnSign('Pisces', planets)).toContain('Saturn');
    expect(aspectsOnSign('Cancer', planets)).toContain('Saturn');
    expect(aspectsOnSign('Libra', planets)).toContain('Saturn');
    expect(aspectsOnSign('Leo', planets)).not.toContain('Saturn');
  });

  it('reads the dasha running today and the next change', () => {
    expect(f.dasha?.maha).toMatchObject({ planet: 'Jupiter', end: '2027-12-07' });
    expect(f.dasha?.antar?.planet).toBe('Rahu');
    expect(f.dasha?.nextChange).toBe('2027-12-07');
    expect(f.dasha?.nextAntar?.planet).toBe('Saturn');
    expect(dashaOn(CHART, '2028-06-01')).toEqual({ maha: 'Saturn', antar: 'Saturn' });
  });

  it('with an unknown birth time counts houses from the Moon and never states a rising sign', () => {
    const u = buildBlueprintFacts({ chart: CHART, timeConfidence: 'unknown', today: '2026-10-11' });
    expect(u.reference).toBe('moon');
    expect(u.lagna).toBeNull();
    expect(u.referenceSign).toBe(u.moonSign);
    expect(u.keys.some((k) => k.key === 'lagna')).toBe(false);
    expect(u.keys.find((k) => k.key === 'reference')?.text).toContain('not known well enough');
  });

  it('gives every fact a unique key', () => {
    const keys = f.keys.map((k) => k.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('birth-time sensitivity', () => {
  it('an exact time near a sign edge is called out; one far from it is not', () => {
    const near = analyzeTimeSensitivity({ ...CHART, lagna_degree: 29.5 } as NatalChartData, 'exact', '2026-10-11');
    expect(near.minutesToEdge).toBe(2);
    expect(sensitivityParagraphs(near).paragraphs[0].kind).toBe('limit');
    const far = analyzeTimeSensitivity({ ...CHART, lagna_degree: 15 } as NatalChartData, 'exact', '2026-10-11');
    expect(far.minutesToEdge).toBe(60);
    expect(sensitivityParagraphs(far).paragraphs[0].kind).toBe('fact');
  });

  it('an approximate time compares the chart at ±1 and ±2 hours', () => {
    const flipped = { ...CHART, lagna: 'Capricorn' } as NatalChartData;
    const s = analyzeTimeSensitivity(CHART, 'approx', '2026-10-11', [
      { offsetMin: -120, chart: flipped },
      { offsetMin: -60, chart: CHART },
      { offsetMin: 60, chart: CHART },
      { offsetMin: 120, chart: CHART },
    ]);
    expect(s.risingSigns.sort()).toEqual(['Aquarius', 'Capricorn']);
    const text = sensitivityParagraphs(s).paragraphs.map((p) => p.text).join(' ');
    expect(text).toContain('could be Aquarius and Capricorn');
    expect(text).toContain('provisional');
  });

  it('an unknown time says houses are counted from the Moon', () => {
    const p = sensitivityParagraphs(analyzeTimeSensitivity(CHART, 'unknown', '2026-10-11')).paragraphs;
    expect(p[0].kind).toBe('limit');
    expect(p[0].text).toContain('Moon sign');
  });

  it('shifts a local time across midnight', () => {
    expect(shiftLocal('1991-03-14', '23:30', 60)).toEqual({ date: '1991-03-15', time: '00:30:00' });
    expect(shiftLocal('1991-03-14', '00:20', -60)).toEqual({ date: '1991-03-13', time: '23:20:00' });
  });
});

describe('Rahu–Ketu windows', () => {
  const samples: NodeSample[] = samplesFromGrid(fakeGrid(weeklyDates('2026-10-11')));

  it('turns the engine’s weekly positions into daily longitudes', () => {
    const days = interpolateDays(samples);
    expect(days.length).toBeGreaterThan(360);
    expect(days[0].date).toBe('2026-10-11');
    // Rahu runs backwards ~0.053°/day.
    expect(days[0].rahu - days[100].rahu).toBeCloseTo(5.29, 1);
    expect(days[0].ketu).toBeCloseTo((days[0].rahu + 180) % 360, 6);
  });

  const natal = natalPoints(
    Object.fromEntries(Object.entries(CHART.planets).map(([k, v]) => [k, { sign: v.sign as Sign, degree: v.degree }])),
    { sign: 'Aquarius', degree: 26.75 },
  );

  it('finds the sign change, the touches and the eclipse seasons for the year', () => {
    const w = computeNodalWindows({ samples, natal, reference: 'Aquarius', focusHouses: [10, 6, 2, 11], from: '2026-10-11', to: '2027-10-11' });
    const kinds = new Set(w.map((x) => x.kind));
    expect(kinds).toContain('ingress');
    expect(kinds).toContain('eclipse_season');
    expect(kinds).toContain('touch');
    // In the fake sky Rahu is at Aquarius 3° on 2026-10-11 and leaves Aquarius at 0° after ~57 days.
    const ingress = w.find((x) => x.kind === 'ingress')!;
    expect(ingress.peak).toBe('2026-12-07');
    expect(ingress.title).toBe('Rahu enters Capricorn, Ketu enters Cancer');
    // Eclipse seasons are about a month long, about half a year apart.
    const seasons = w.filter((x) => x.kind === 'eclipse_season');
    expect(seasons.length).toBe(2);
    for (const s of seasons) expect(Date.parse(s.end) - Date.parse(s.start)).toBeGreaterThan(25 * 86_400_000);
    // Every window is inside the year asked for.
    for (const x of w) expect(x.peak ? x.peak >= '2026-10-11' && x.peak <= '2027-10-11' : true).toBe(true);
  });

  it('marks windows whose axis falls on the reader’s focus houses, and keeps every sign change when trimming', () => {
    const w = computeNodalWindows({ samples, natal, reference: 'Aquarius', focusHouses: [6], from: '2026-10-11', to: '2027-10-11' });
    expect(w.filter((x) => x.onFocusHouse).length).toBeGreaterThan(0);
    const picked = pickWindows(w, 3);
    expect(picked.some((x) => x.kind === 'ingress')).toBe(true);
    expect(picked.length).toBeLessThanOrEqual(3);
    const sorted = [...picked].sort((a, b) => a.start.localeCompare(b.start));
    expect(picked).toEqual(sorted);
  });

  it('reports a calm year as no windows at all rather than inventing one', () => {
    // Nodes parked far from every natal point and the Sun, over a short span with no sign change.
    const still: NodeSample[] = [
      { date: '2026-10-11', rahuLon: 100, sunLon: 10 },
      { date: '2026-10-18', rahuLon: 99.6, sunLon: 17 },
      { date: '2026-10-25', rahuLon: 99.2, sunLon: 24 },
    ];
    const w = computeNodalWindows({ samples: still, natal: [{ name: 'Moon', lon: 250, weight: 75 }], reference: 'Aries', focusHouses: [], from: '2026-10-11', to: '2026-10-25' });
    expect(w).toEqual([]);
  });
});

describe('content lint', () => {
  it('catches the H5 terms and the extra bans', () => {
    expect(bannedHits('This period may bring illness')).toContain('illness diagnosis');
    expect(bannedHits('A curse from before')).toContain('curse');
    expect(bannedHits('Wear a blue sapphire gemstone')).toContain('remedy selling');
    expect(bannedHits('Conception looks likely')).toContain('conception / fertility');
    expect(bannedHits('This will definitely will happen, guaranteed')).toContain('certainty');
    expect(bannedHits('You will be hurt')).toContain('loss / harm prediction');
  });

  it('does not trip on ordinary words that contain a banned stem', () => {
    expect(bannedHits('Studies and diet and a deadline: dead centre of a steady week.')).toEqual(['die / dying / dead']);
    expect(bannedHits('Studies, diet and a steady week with an ordinary schedule.')).toEqual([]);
  });

  it('applies the reader’s request for calm only when they asked', () => {
    expect(bannedHits('Avoid signing in this window', { calm: true })).toContain('anxious wording (reader asked for calm)');
    expect(bannedHits('Avoid signing in this window')).toEqual([]);
  });

  it('flags a sign, house or date the facts never mentioned', () => {
    const allowed = 'Ketu is in Cancer. Jupiter rules your 2nd and 11th houses. Window 2026-12-06.';
    expect(ungrounded('Ketu in Cancer, with your 2nd house and 11th house, around 2026-12-06.', allowed)).toEqual([]);
    expect(ungrounded('Ketu in Taurus', allowed)).toEqual(['sign Taurus is not in the facts']);
    expect(ungrounded('Your 7th house', allowed)).toEqual(['7th house is not in the facts']);
    expect(ungrounded('Around 2026-12-25', allowed)).toEqual(['date 2026-12-25 is not in the facts']);
  });
});

describe('the library, and every line we wrote by hand', () => {
  const all: [string, string][] = [
    ...Object.entries(library.NAKSHATRA_NOTE).map(([k, v]): [string, string] => [`nakshatra ${k}`, v]),
    ...Object.entries(library.AXIS_THEME).map(([k, v]): [string, string] => [`axis ${k}`, v]),
    ...Object.entries(library.DEBT_PRACTICES).flatMap(([k, v]) => v.map((t, i): [string, string] => [`practice ${k}.${i}`, t])),
    ...Object.entries(library.DASHA_LORD_NOTE).map(([k, v]): [string, string] => [`dasha ${k}`, v]),
    ...Object.entries(library.HOUSE_THEME).map(([k, v]): [string, string] => [`house ${k}`, v]),
    ...library.LIMITS_FIXED.map((t, i): [string, string] => [`limit ${i}`, t]),
  ];
  it('covers all 27 nakshatras, 12 axes, 12 houses of practices and 9 period lords', () => {
    expect(Object.keys(library.NAKSHATRA_NOTE)).toHaveLength(27);
    expect(Object.keys(library.AXIS_THEME)).toHaveLength(12);
    expect(Object.keys(library.DEBT_PRACTICES)).toHaveLength(12);
    for (const p of Object.values(library.DEBT_PRACTICES)) expect(p).toHaveLength(3);
    expect(Object.keys(library.DASHA_LORD_NOTE)).toHaveLength(9);
  });
  // The closing "limits" lines name the things they rule out ("not a warning", "asks you to buy"), so they
  // are held to the main lint but not to the calm-reader or no-sales word lists.
  const notLimits = all.filter(([name]) => !name.startsWith('limit '));
  it('contains none of the banned terms, in any line', () => {
    for (const [name, text] of all) expect(bannedHits(text), name).toEqual([]);
  });
  it('uses no anxious wording anywhere a calm reader will see it', () => {
    for (const [name, text] of notLimits) expect(bannedHits(text, { calm: true }), name).toEqual([]);
  });
  it('never asks the reader to buy, burn, wear or pay for anything', () => {
    for (const [name, text] of notLimits) expect(text, name).not.toMatch(/\b(buy|purchase|wear|donate money|ritual|mantra|gem)\b/i);
  });
});

describe('model JSON that is nearly right', () => {
  it('closes a missing final brace, as one real run needed', () => {
    const text = '{"sections":{"a":{"paragraphs":[{"kind":"advice","text":"x","uses":["k"]}]}}';
    expect(parseModelJson(text)).toEqual({ sections: { a: { paragraphs: [{ kind: 'advice', text: 'x', uses: ['k'] }] } } });
    expect(closeBrackets('{"a":[1,2')).toBe('{"a":[1,2]}');
  });
  it('still refuses a reply cut off inside a string, or wrongly nested', () => {
    expect(parseModelJson('{"a":"cut off here')).toBeNull();
    expect(closeBrackets('{"a":"cut off here')).toBeNull();
    expect(closeBrackets('{"a":[}')).toBeNull();
    expect(parseModelJson('not json at all')).toBeNull();
  });
});

describe('model cost', () => {
  it('multiplies tokens by the list price', () => {
    // Sonnet 5.5: $2 in, $10 out per million.
    expect(costUsd('claude-sonnet-5-5', 10_000, 5_000)).toBeCloseTo(0.07, 6);
    expect(costUsd('claude-haiku-5-5', 1_000_000, 1_000_000)).toBeCloseTo(0.6, 6);
  });
  it('returns null rather than guessing for a model it does not know', () => {
    expect(costUsd('grok-4.20', 1000, 1000)).toBeNull();
    expect(costUsd('claude-sonnet-5-5', null, 1000)).toBeNull();
    expect(Object.keys(MODEL_PRICES).length).toBeGreaterThan(5);
  });
});

describe('sign table sanity', () => {
  it('has twelve signs', () => expect(SIGNS).toHaveLength(12));
});
