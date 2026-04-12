/**
 * Port of Python `classify_functional_nature` + `build_functional_lord_groups`
 * (`ephemeris-service/main.py`).
 */

import { getBadhakaLord, housesRuledByPlanet, SEVEN_GRAHAS } from './horaBase';

export type FunctionalNature = 'benefic' | 'malefic' | 'neutral' | 'badhaka';

export interface FunctionalLordGroups {
  benefics: string[];
  malefics: string[];
  neutral: string[];
  badhaka: string[];
}

export function classifyFunctionalNature(lagnaIndex: number): Record<string, FunctionalNature> {
  const li = ((lagnaIndex % 12) + 12) % 12;
  const badhakaLord = getBadhakaLord(li);
  const result: Record<string, FunctionalNature> = {};

  for (const planet of SEVEN_GRAHAS) {
    const houses = housesRuledByPlanet(li, planet);
    if (planet === badhakaLord) {
      result[planet] = 'badhaka';
    } else if (houses.some((h) => [1, 5, 9].includes(h))) {
      result[planet] = 'benefic';
    } else if (houses.some((h) => [6, 8, 12].includes(h)) && !houses.some((h) => [1, 5, 9].includes(h))) {
      result[planet] = 'malefic';
    } else if (houses.some((h) => [4, 7, 10].includes(h))) {
      result[planet] = 'neutral';
    } else {
      result[planet] = 'neutral';
    }
  }

  return result;
}

const LABEL_FOR: Record<FunctionalNature, keyof FunctionalLordGroups> = {
  benefic: 'benefics',
  malefic: 'malefics',
  neutral: 'neutral',
  badhaka: 'badhaka',
};

/** UI lines like `Mars — H1, H5` grouped by functional nature. */
export function buildFunctionalLordGroups(lagnaIndex: number): FunctionalLordGroups {
  const li = ((lagnaIndex % 12) + 12) % 12;
  const nature = classifyFunctionalNature(li);
  const groups: FunctionalLordGroups = {
    benefics: [],
    malefics: [],
    neutral: [],
    badhaka: [],
  };

  for (const planet of SEVEN_GRAHAS) {
    const houses = housesRuledByPlanet(li, planet).sort((a, b) => a - b);
    if (houses.length === 0) continue;
    const hh = houses.map((h) => `H${h}`).join(', ');
    const line = `${planet} — ${hh}`;
    const key = LABEL_FOR[nature[planet]!]!;
    groups[key].push(line);
  }

  return groups;
}
