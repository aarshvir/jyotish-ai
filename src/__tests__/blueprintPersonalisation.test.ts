import { describe, it, expect } from 'vitest';
import type { NatalChartData } from '@/lib/agents/types';
import { assembleBlueprint, generateBlueprint, narrateGroup, narrativeGroups, prepareBlueprint, type GenerateInput } from '@/lib/blueprint/generate';
import { bannedHits } from '@/lib/blueprint/lint';
import { blueprintToMarkdown } from '@/lib/blueprint/markdown';
import type { BlueprintDoc } from '@/lib/blueprint/types';
import { houseFrom, SIGNS, type Sign } from '@/lib/funnel/reveal/astro';
import { FUNNEL_FIXTURE, SAME_CHART_BIRTH, START_FIXTURES } from '@/lib/personalization/fixtures';
import { BASE_INPUT, CHART, fakeEphemeris, fakeGrid, fakeLlm } from './helpers/blueprintFakes';

// One invented chart, several invented people. The point of this file: the same chart must
// produce visibly different reports when the answers differ — and the same facts when they do not.

const input = (personalContext: string, over: Partial<GenerateInput> = {}): GenerateInput => ({
  ...BASE_INPUT,
  personalContext,
  plan: 'blueprint',
  ...over,
});

async function make(personalContext: string, over: Partial<GenerateInput> = {}, llm = fakeLlm(), eph = fakeEphemeris()) {
  const doc = await generateBlueprint(input(personalContext, over), { ephemeris: eph, llm }, new Date('2026-10-11T08:00:00Z'));
  return { doc, llm, eph };
}

const ids = (d: BlueprintDoc) => d.sections.map((s) => s.id);
const text = (d: BlueprintDoc) => blueprintToMarkdown(d);
/** Only what the sections say; the brief quotes the reader's own words back, which are theirs to write. */
const sectionText = (d: BlueprintDoc) => d.sections.flatMap((s) => s.paragraphs.map((p) => p.text)).join(' ');
const section = (d: BlueprintDoc, id: string) => d.sections.find((s) => s.id === id);

describe('same chart, different answers → different report', () => {
  it('orders the sections by what each person said matters', async () => {
    const asha = await make(START_FIXTURES.asha);
    const rohan = await make(START_FIXTURES.rohan);
    const meera = await make(START_FIXTURES.meera);
    const nobody = await make(START_FIXTURES.nobody);

    // Asha: a dated interview and work → the event, the work chapter and the chapter she is in come first.
    expect(ids(asha.doc).slice(0, 5)).toEqual(['snapshot', 'event', 'focus', 'dasha', 'windows']);
    // Rohan: a named person → her chapter leads, then love.
    expect(ids(rohan.doc).slice(0, 3)).toEqual(['snapshot', 'focus', 'partner']);
    // Meera: health, said to be a year-long concern → health chapter, then the long chapter.
    expect(ids(meera.doc).slice(0, 3)).toEqual(['snapshot', 'focus', 'dasha']);
    // Nobody answered: the standard order of the spec, no personal sections.
    expect(ids(nobody.doc)).toEqual(['snapshot', 'ketu', 'rahu', 'axis', 'fifth_ninth', 'dasha', 'debt', 'windows', 'limits']);

    // Four different orders from one chart.
    const orders = new Set([asha, rohan, meera, nobody].map((x) => ids(x.doc).join('>')));
    expect(orders.size).toBe(4);
  });

  it('opens by quoting each person’s own selections back to them', async () => {
    const asha = (await make(START_FIXTURES.asha)).doc;
    const rohan = (await make(START_FIXTURES.rohan)).doc;
    const flat = (d: BlueprintDoc) => d.brief.selections.map((s) => `${s.topic}: ${s.value}`).join(' | ');

    expect(asha.brief.heading).toBe('Asha, here is what you told us');
    expect(flat(asha)).toContain('What was weighing on you most: Work and money');
    expect(flat(asha)).toContain('Closest to your situation: I am thinking of changing jobs');
    expect(flat(asha)).toContain('Coming up: “interview at a new company on 12 November” (12 November 2026)');
    expect(flat(asha)).toContain('too vague to act on');
    expect(flat(asha)).toContain('Astrologers you have consulted: Yes, regularly');

    expect(flat(rohan)).toContain('What was weighing on you most: Marriage and love');
    expect(flat(rohan)).toContain('The person involved: Kavya');
    expect(flat(rohan)).toContain('Your birth time: approximate, within an hour or two');
    expect(flat(rohan)).not.toContain('interview');
  });

  it('puts a "Why this is in your report" line on every section, naming the answer that triggered it', async () => {
    const asha = (await make(START_FIXTURES.asha)).doc;
    for (const s of asha.sections) expect(s.why.length, s.id).toBeGreaterThan(20);
    expect(section(asha, 'event')!.why).toContain('interview at a new company on 12 November');
    expect(section(asha, 'focus')!.why).toContain('Work and money');
    expect(section(asha, 'dasha')!.why).toContain('years');
    expect(section(asha, 'debt')!.why).toContain('pressure to buy');
    expect(section(asha, 'debt')!.why).toContain('vague');
    expect(section(asha, 'windows')!.why).toContain('windows within three weeks');

    const rohan = (await make(START_FIXTURES.rohan)).doc;
    expect(section(rohan, 'partner')!.why).toContain('Kavya');
    expect(section(rohan, 'partner')!.why).toContain('birth details');
    expect(section(rohan, 'snapshot')!.why).toContain('approximate');

    const meera = (await make(START_FIXTURES.meera)).doc;
    expect(section(meera, 'snapshot')!.why).toContain('not known');
    expect(section(meera, 'limits')!.why).toContain('anxious');

    const nobody = (await make(START_FIXTURES.nobody)).doc;
    expect(nobody.brief.selections).toEqual([]);
    expect(section(nobody, 'ketu')!.why).not.toContain('you said');
  });

  it('puts windows around the date the reader gave — and none when they gave none', async () => {
    const asha = (await make(START_FIXTURES.asha)).doc;
    const ev = section(asha, 'event')!;
    expect(ev.table?.rows).toHaveLength(7);
    expect(ev.table?.rows.map((r) => r[0])).toContain('Thu 12 Nov');
    expect(ev.paragraphs.map((p) => p.text).join(' ')).toContain('12 November 2026');
    expect(ev.paragraphs.map((p) => p.text).join(' ')).toContain('On that date you are in the');
    // Windows that overlap the three weeks around the date are listed.
    expect(ev.paragraphs.some((p) => p.text.includes('overlaps the three weeks either side of your date'))).toBe(true);

    // "A decision soon" has no date: no event section, but the windows section says so.
    const rohan = (await make(START_FIXTURES.rohan)).doc;
    expect(section(rohan, 'event')).toBeUndefined();

    // A date with no day in it: months with and without a window instead.
    const undated = (await make('What is weighing on me most: A business decision. Coming up: starting a new shop sometime in spring.')).doc;
    const u = section(undated, 'event')!;
    expect(u.table).toBeUndefined();
    expect(u.paragraphs.map((p) => p.text).join(' ')).toContain('Quieter months');
    expect(u.why).toContain('no exact date');
  });

  it('treats an unknown birth time honestly: houses from the Moon, no rising sign anywhere', async () => {
    const meera = (await make(START_FIXTURES.meera)).doc;
    expect(meera.reference).toBe('moon');
    expect(meera.timeConfidence).toBe('unknown');
    const snap = section(meera, 'snapshot')!;
    expect(snap.table?.rows[0]).toEqual(['Rising sign', 'Not used (birth time not known)']);
    expect(text(meera)).not.toContain('Aquarius (26.8°)');
    expect(snap.paragraphs.map((p) => p.text).join(' ')).toContain('every house is counted from your Moon sign');
    expect(meera.brief.arrangement.join(' ')).toContain('counted from your Moon sign');
  });

  it('with no birth time at all, checks the whole day for a Moon that changes sign', async () => {
    const eph = fakeEphemeris({ moonFlips: true });
    const meera = (await make(START_FIXTURES.meera, {}, fakeLlm(), eph)).doc;
    expect(eph.natalCalls.map((c) => c.time).sort()).toEqual(['00:05:00', '12:00:00', '23:55:00']);
    const snap = section(meera, 'snapshot')!.paragraphs.map((p) => p.text).join(' ');
    expect(snap).toContain('could be in');
    expect(snap).toContain('every house shifts by one');
    expect(snap).toContain('the planet ruling your current major period could be Jupiter and Mars');
    // A stable Moon says so, instead.
    const calm = (await make(START_FIXTURES.meera)).doc;
    expect(section(calm, 'snapshot')!.paragraphs.map((p) => p.text).join(' ')).toContain('your Moon stays in Aquarius from midnight to midnight');
  });

  it('shows a window that began before today with its real start, and says it is already under way', async () => {
    const asha = (await make(START_FIXTURES.asha)).doc;
    const w = section(asha, 'windows')!.windows!.find((x) => x.title === 'Rahu meets your Moon')!;
    expect(w.start < '2026-10-11').toBe(true);
    expect(w.fact).toContain('(already under way)');
    // A window that ended before today is not shown at all.
    for (const x of section(asha, 'windows')!.windows!) expect(x.end >= '2026-10-11').toBe(true);
  });

  it('checks an approximate birth time at ±2 hours and says what moves', async () => {
    const eph = fakeEphemeris({ risingFlips: true });
    const rohan = (await make(START_FIXTURES.rohan, {}, fakeLlm(), eph)).doc;
    // One call for the chart, four for the ±1h/±2h variants.
    expect(eph.natalCalls).toHaveLength(5);
    expect(eph.natalCalls.map((c) => c.time).sort()).toEqual(['04:40:00', '05:40:00', '06:40:00', '07:40:00', '08:40:00']);
    const snap = section(rohan, 'snapshot')!.paragraphs.map((p) => p.text).join(' ');
    expect(snap).toContain('rising sign could be');
    expect(snap).toContain('provisional');
    // An exact time makes one chart call only.
    const eph2 = fakeEphemeris();
    await make(START_FIXTURES.asha, {}, fakeLlm(), eph2);
    expect(eph2.natalCalls).toHaveLength(1);
  });

  it('tells the writer what each person asked for: concrete, calm, no sales, plain, long-term', async () => {
    const a = await make(START_FIXTURES.asha);
    const m = await make(START_FIXTURES.meera);
    const r = await make(START_FIXTURES.rohan);
    const n = await make(START_FIXTURES.nobody);
    const sys = (x: { llm: ReturnType<typeof fakeLlm> }) => x.llm.prompts[0].system;

    expect(sys(a)).toContain('too vague');
    expect(sys(a)).toContain('with a day, a number of days or a count');
    expect(sys(a)).toContain('Mention no gemstone');
    expect(sys(a)).toContain('Skip explanations of what a house');
    expect(sys(a)).toContain('thinking of changing jobs');
    expect(sys(a)).toContain('for years');
    expect(sys(a)).not.toContain('Never use the words avoid');

    expect(sys(m)).toContain('Never use the words avoid, warning, bad, harmful or risky');
    expect(sys(m)).toContain('Say nothing about the condition');
    expect(sys(m)).toContain('The birth time is unknown');
    expect(sys(m)).not.toContain('Mention no gemstone');

    expect(sys(r)).toContain('Explain each astrology term in the same sentence');
    expect(sys(r)).toContain('Kavya');
    expect(sys(r)).toContain('there is no chart for Kavya');
    expect(sys(r)).toContain('plans by the hour');
    expect(sys(r)).toContain('approximate');

    expect(sys(n)).not.toContain('too vague');
    expect(sys(n)).not.toContain('DIRECTIVES FOR THIS READER\n- The reader');
  });

  it('gives the model the reader’s own words as data, and the typed date to quote', async () => {
    const a = await make(START_FIXTURES.asha);
    const user = a.llm.prompts.map((p) => p.user).join('\n');
    expect(user).toContain('WHAT THE READER TOLD US (data):');
    expect(user).toContain('interview at a new company on 12 November');
    expect(user).toContain('(12 November 2026)');
  });

  it('keeps a banned word in the reader’s own event text out of the model’s hands, but shows it back to them', async () => {
    const ctx = 'What is weighing on me most: Children and family. Coming up: my father’s death anniversary on 12 November.';
    const { doc, llm } = await make(ctx);
    // The standing rules in the system prompt name "death" as forbidden; the reader-specific parts must not.
    const readerParts = llm.prompts.map((p) => p.user + p.system.split('DIRECTIVES FOR THIS READER')[1]).join('\n');
    expect(readerParts).not.toMatch(/death/i);
    expect(readerParts).toContain('a personal date');
    expect(doc.brief.selections.find((s) => s.topic === 'Coming up')?.value).toContain('death anniversary');
  });

  it('writes in the funnel’s own terms: the question that was asked, the role picked, the goal', async () => {
    const { doc, llm } = await make(FUNNEL_FIXTURE);
    const flat = doc.brief.selections.map((s) => `${s.topic}: ${s.value}`).join(' | ');
    expect(flat).toContain('Do the same lessons keep showing up in your life?: Yes, again and again');
    expect(flat).toContain('Where it repeats most: Family');
    expect(flat).toContain('What matters most in the next 12 months: Peace of mind');
    expect(section(doc, 'ketu')!.why).toContain('Healer / caregiver');
    expect(section(doc, 'rahu')!.why).toContain('Peace of mind');
    expect(ids(doc).slice(0, 3)).toEqual(['snapshot', 'focus', 'debt']);
    // Ketu is in Cancer (healer): the pick agrees with the chart, and the report says so without calling it proof.
    const k = section(doc, 'ketu')!.paragraphs.map((p) => p.text).join(' ');
    expect(k).toContain('points to the same one');
    expect(k).toContain('not proof');
    expect(llm.prompts[0].system).toContain('never evidence about the chart');
  });
});

describe('the pipeline’s safety rails', () => {
  it('retries a section whose text fails the lint, then ships it clean', async () => {
    const llm = fakeLlm({ bad: (id, call) => (id === 'ketu' && call === 1 ? 'This hints at a coming illness and a curse that you must remove with a gemstone, definitely will.' : null) });
    const { doc } = await make(START_FIXTURES.asha, {}, llm);
    expect(doc.qa.lintRetries).toBe(1);
    expect(doc.qa.flaggedSections).toEqual([]);
    expect(llm.prompts.some((p) => p.user.includes('YOUR PREVIOUS ANSWER WAS REJECTED'))).toBe(true);
    expect(sectionText(doc)).not.toMatch(/illness|curse|gemstone/i);
  });

  it('after two failed retries flags the section and shows only calculated text plus our own reading', async () => {
    const llm = fakeLlm({ bad: (id) => (id === 'ketu' ? 'A curse and an illness await you; do not ignore the danger of death.' : null) });
    const { doc } = await make(START_FIXTURES.asha, {}, llm);
    expect(doc.qa.flaggedSections).toContain('ketu');
    expect(doc.qa.flagReasons.ketu?.join(' ')).toContain('banned content');
    expect(section(doc, 'ketu')!.flagged).toBe(true);
    expect(sectionText(doc)).not.toMatch(/\bcurse\b|\billness\b|\bdanger\b|\bdeath\b/i);
    // 1 try + 2 retries for that section, and the other groups are untouched.
    expect(llm.prompts.filter((p) => p.stage.includes('ketu')).length).toBe(3);
    // The rest of the report is intact.
    expect(section(doc, 'rahu')!.flagged).toBeUndefined();
    expect(section(doc, 'ketu')!.paragraphs.length).toBeGreaterThan(2);
  });

  it('rejects a paragraph that names a sign, house or fact the section was never given', async () => {
    const llm = fakeLlm({ bad: (id, call) => (id === 'ketu' && call === 1 ? 'Your Ketu in Taurus in the 3rd house shows a quick mind that picks up new words and skills with very little effort, and it keeps asking why.' : null) });
    const { doc } = await make(START_FIXTURES.nobody, {}, llm);
    expect(doc.qa.lintRetries).toBe(1);
    expect(text(doc)).not.toContain('Ketu in Taurus');
  });

  it('rejects a paragraph that cites a fact key it was not given', async () => {
    const llm = fakeLlm();
    const orig = llm.complete.bind(llm);
    let first = true;
    llm.complete = async (a) => {
      const r = await orig(a);
      if (first) {
        first = false;
        return { ...r, text: r.text.replace(/"uses":\["[^"]+"/, '"uses":["invented.key"') };
      }
      return r;
    };
    const { doc } = await make(START_FIXTURES.nobody, {}, llm);
    expect(doc.qa.lintRetries).toBe(1);
  });

  it('every model paragraph carries source_keys that exist in its section’s facts', async () => {
    const eph = fakeEphemeris();
    const prepared = await prepareBlueprint(input(START_FIXTURES.asha), { ephemeris: eph });
    const llm = fakeLlm();
    const outcomes = [];
    for (const g of narrativeGroups(prepared)) outcomes.push(await narrateGroup(prepared, g, llm));
    const doc = assembleBlueprint(prepared, outcomes);
    for (const { id, narrative } of prepared.built) {
      if (!narrative) continue;
      const allowed = new Set(narrative.facts.map((f) => f.key));
      const added = section(doc, id)!.paragraphs.slice(prepared.built.find((b) => b.id === id)!.section.paragraphs.length);
      expect(added.length, id).toBe(narrative.kinds.length);
      for (const p of added) {
        expect(p.source_keys.length, id).toBeGreaterThan(0);
        for (const k of p.source_keys) expect(allowed.has(k), `${id}:${k}`).toBe(true);
      }
    }
  });

  it('is plain JSON all the way through, so each phase can be a durable step', async () => {
    const prepared = await prepareBlueprint(input(START_FIXTURES.asha), { ephemeris: fakeEphemeris() });
    expect(JSON.parse(JSON.stringify(prepared))).toEqual(prepared);
    const { doc } = await make(START_FIXTURES.asha);
    expect(JSON.parse(JSON.stringify(doc))).toEqual(doc);
  });

  it('records what the document cost, summed per call', async () => {
    const { doc } = await make(START_FIXTURES.asha);
    expect(doc.qa.calls).toBe(3);
    expect(doc.qa.usage).toEqual({ input: 3000, output: 1500 });
    // Sonnet 5.5 at $2/$10 per million: 3k in, 1.5k out.
    expect(doc.qa.costUsd).toBeCloseTo(0.021, 6);
    expect(doc.qa.models).toEqual(['claude-sonnet-5-5']);
  });
});

describe('the 30-day add-on', () => {
  it('adds a day-by-day section from the engine without another model call', async () => {
    const base = await make(START_FIXTURES.nobody);
    const plus = await make(START_FIXTURES.nobody, { plan: 'blueprint_plus30' });
    expect(ids(base.doc)).not.toContain('thirty');
    const t = section(plus.doc, 'thirty')!;
    expect(t.table?.rows).toHaveLength(30);
    expect(t.table?.head).toContain('Best hours');
    expect(plus.llm.prompts.length).toBe(base.llm.prompts.length);
    expect(ids(plus.doc).indexOf('thirty')).toBeGreaterThan(ids(plus.doc).indexOf('windows'));
  });

  it('puts the add-on first for someone who plans by the hour', async () => {
    const plus = await make(START_FIXTURES.rohan, { plan: 'blueprint_plus30' });
    expect(ids(plus.doc)).toContain('thirty');
    expect(plus.doc.sections.find((s) => s.id === 'thirty')!.why).toContain('placed up front');
  });
});

describe('every chart the engine can return', () => {
  function chartFor(lagna: Sign, rahu: Sign): NatalChartData {
    const ketu = SIGNS[(SIGNS.indexOf(rahu) + 6) % 12];
    const base: Record<string, Sign> = { Sun: 'Aries', Moon: 'Taurus', Mars: 'Gemini', Mercury: 'Aries', Jupiter: 'Leo', Venus: 'Taurus', Saturn: 'Virgo', Rahu: rahu, Ketu: ketu };
    const planets: NatalChartData['planets'] = {};
    for (const [n, s] of Object.entries(base)) planets[n] = { sign: s, degree: 10, nakshatra: 'Rohini', nakshatra_pada: 2, is_retrograde: false, house: houseFrom(s, lagna) };
    return { ...CHART, lagna, planets, moon_nakshatra: 'Rohini' };
  }

  it('144 rising-sign × Rahu-sign charts: no banned term in anything we calculate or write by hand, every paragraph sourced', async () => {
    let n = 0;
    for (const lagna of SIGNS) {
      for (const rahu of SIGNS) {
        const eph = { ...fakeEphemeris(), natalChart: async () => chartFor(lagna, rahu) };
        const prepared = await prepareBlueprint(input(START_FIXTURES.asha), { ephemeris: eph });
        for (const { id, section: s, narrative } of prepared.built) {
          for (const p of s.paragraphs) {
            expect(p.source_keys.length, `${lagna}/${rahu} ${id}`).toBeGreaterThan(0);
            // The reader’s own quoted words are theirs; everything else must be clean.
            const own = p.text.replace(/“[^”]*”/g, '');
            expect(bannedHits(own), `${lagna}/${rahu} ${id}: ${p.text.slice(0, 70)}`).toEqual([]);
          }
          for (const t of narrative?.fallback ?? []) expect(bannedHits(t), `${lagna}/${rahu} ${id} fallback`).toEqual([]);
        }
        n++;
      }
    }
    expect(n).toBe(144);
  });
});

describe('the sample sky', () => {
  it('the fake engine grid has the shape the generator reads', () => {
    const g = fakeGrid(['2026-10-11']);
    expect(g[0].planet_positions?.planets?.Rahu?.sign).toBe('Aquarius');
    expect(SAME_CHART_BIRTH.city).toContain('Pune');
  });
});
