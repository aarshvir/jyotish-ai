/**
 * Test doubles for the Blueprint's two ports. Everything is invented: the chart is an
 * invented birth (1991-03-14, Pune, 06:40) captured once from the engine, the grid is
 * generated, and the "model" writes clean, checkable paragraphs from the prompt it is given.
 */

import chartJson from '../fixtures/chart-invented-aquarius.json';
import type { NatalChartData } from '@/lib/agents/types';
import type { BlueprintDeps, GridDay, LlmPort, LlmResult } from '@/lib/blueprint/deps';
import { SIGNS } from '@/lib/funnel/reveal/astro';
import { addDays, daysBetween } from '@/lib/personalization/eventDate';

export const CHART = chartJson as unknown as NatalChartData;

export const BASE_INPUT = {
  name: 'Asha Verma',
  birthDate: '1991-03-14',
  birthTime: '06:40' as string | null,
  city: 'Pune, India',
  lat: 18.52,
  lng: 73.86,
  today: '2026-10-11',
};

const posOf = (lon: number) => {
  const l = ((lon % 360) + 360) % 360;
  return { sign: SIGNS[Math.floor(l / 30)], degree: Math.round((l % 30) * 10000) / 10000 };
};

/** Rahu 0.0529°/day backwards from Aquarius 3.0° on 2026-10-11; Sun 0.9856°/day from Libra 25°. */
export function fakeGrid(dates: string[]): GridDay[] {
  const anchor = '2026-10-11';
  return dates.map((date) => {
    const n = daysBetween(anchor, date);
    const rahu = 300 + 3 - 0.0529 * n;
    const sun = 180 + 25 + 0.9856 * n;
    const moon = (n * 13.1764 + 40) % 360;
    const slots = Array.from({ length: 18 }, (_, i) => ({
      slot_index: i,
      display_label: `${String(6 + i).padStart(2, '0')}:00–${String(7 + i).padStart(2, '0')}:00`,
      score: 30 + ((n * 7 + i * 11) % 60),
      dominant_hora: 'Jupiter',
      dominant_choghadiya: 'Amrit',
      is_rahu_kaal: i === 7 || i === 8,
    }));
    return {
      date,
      day_score: Math.round(slots.reduce((a, s) => a + s.score, 0) / 18),
      rahu_kaal: { start: '13:43:00', end: '15:07:00' },
      slots,
      planet_positions: { planets: { Sun: posOf(sun), Moon: posOf(moon), Rahu: posOf(rahu), Ketu: posOf(rahu + 180) } },
    } as GridDay;
  });
}

export interface FakeEphemeris {
  natalCalls: { date: string; time: string }[];
  gridCalls: string[][];
}

/** A natal chart whose time-variants differ only if `risingFlips` is set (to exercise the ± check). */
export function fakeEphemeris(opts: { risingFlips?: boolean; moonFlips?: boolean } = {}): BlueprintDeps['ephemeris'] & FakeEphemeris {
  const natalCalls: FakeEphemeris['natalCalls'] = [];
  const gridCalls: string[][] = [];
  return {
    natalCalls,
    gridCalls,
    async natalChart(input) {
      natalCalls.push({ date: input.date, time: input.time });
      const early = input.date < '1991-03-14' || (input.date === '1991-03-14' && input.time < '05:00:00');
      if (opts.moonFlips && early) {
        // A Moon that has not yet crossed into Aquarius early in the day.
        // ...and, being in an earlier nakshatra, runs a different major period.
        const mars = { planet: 'Mars', start_date: '2020-01-01', end_date: '2030-01-01', antardasha: [{ planet: 'Mars', start_date: '2020-01-01', end_date: '2030-01-01' }] };
        return {
          ...CHART,
          dasha_sequence: [mars],
          planets: { ...CHART.planets, Moon: { ...CHART.planets.Moon, sign: 'Capricorn', degree: 28.9 } },
        } as NatalChartData;
      }
      return opts.risingFlips && early ? ({ ...CHART, lagna: 'Capricorn', lagna_degree: 29.9 } as NatalChartData) : CHART;
    },
    async dailyGrid({ dates }) {
      gridCalls.push(dates);
      return fakeGrid(dates);
    },
  };
}

const LINE = /^- ([a-z0-9_.=\-:]+): /;
const NL = String.fromCharCode(10);

/**
 * A "model" that answers the prompt it is given: for each SECTION block, the asked kinds,
 * citing the first facts of that section. `bad(sectionId, callNumber)` can make a section's
 * first paragraph come back as the given text, to exercise the lint and its retries.
 */
export function fakeLlm(
  opts: { bad?: (sectionId: string, call: number) => string | null } = {},
): LlmPort & { prompts: { system: string; user: string; stage: string }[] } {
  const prompts: { system: string; user: string; stage: string }[] = [];
  let call = 0;
  return {
    prompts,
    async complete({ system, user, stage }): Promise<LlmResult> {
      prompts.push({ system, user, stage });
      call++;
      const sections: Record<string, { paragraphs: { kind: string; text: string; uses: string[] }[] }> = {};
      for (const block of user.split(`${NL}${NL}---${NL}${NL}`)) {
        const id = block.match(/SECTION ([a-z_]+):/)?.[1];
        if (!id) continue;
        // Only the lines between "FACTS" and the next heading are fact keys.
        const afterFacts = block.split(`FACTS (cite these keys):${NL}`)[1] ?? '';
        const factBlock = afterFacts.split(`${NL}TRADITIONAL READING`)[0].split(`${NL}WRITE:`)[0];
        const keys = factBlock
          .split(NL)
          .map((l) => l.match(LINE)?.[1])
          .filter((k): k is string => Boolean(k));
        const kinds = (block.match(/in this order of kind: ([a-z, ]+)\./)?.[1] ?? 'interpretation').split(/,\s*/);
        const bad = opts.bad?.(id, call) ?? null;
        sections[id] = {
          paragraphs: kinds.map((kind, i) => ({
            kind,
            text:
              bad && i === 0
                ? bad
                : `This is a clean test paragraph number ${i + 1} for the ${id} section. It rests on the chart facts that were supplied, it speaks in plain words, and it makes no claim beyond them. It is long enough to pass the length check without using any banned term at all.`,
            uses: keys.slice(0, 2),
          })),
        };
      }
      return { text: JSON.stringify({ sections }), model: 'claude-sonnet-5-5', usage: { input: 1000, output: 500 } };
    },
  };
}

export { addDays };
