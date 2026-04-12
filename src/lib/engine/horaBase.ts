/**
 * Port of `ephemeris-service/main.py` — `SIGN_LORD`, `get_house_lord`,
 * `get_badhaka_lord`, `_houses_ruled_by_planet`, `_house_hora_weight`,
 * `compute_hora_base_for_lagna`.
 *
 * MUST stay in lockstep with Python; parity tests in `src/__tests__/horaBase.test.ts`.
 */

export const SIGN_LORD: readonly string[] = [
  'Mars',
  'Venus',
  'Mercury',
  'Moon',
  'Sun',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Saturn',
  'Jupiter',
];

export const SEVEN_GRAHAS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'] as const;

export const LAGNA_SIGNS_ORDER = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
] as const;

export function lagnaSignToIndex(name: string | undefined | null): number {
  const n = (name ?? '').trim();
  const i = (LAGNA_SIGNS_ORDER as readonly string[]).indexOf(n);
  return i >= 0 ? i : 3;
}

const KENDRA_EX_H1 = new Set([4, 7, 10]);
const TRI_59 = new Set([5, 9]);

/** Lord of house 1–12 for lagna index 0–11 (whole-sign). */
export function getHouseLord(lagnaIndex: number, houseNumber: number): string {
  const signIndex = (lagnaIndex + houseNumber - 1 + 12) % 12;
  return SIGN_LORD[signIndex]!;
}

/** Badhaka lord: 11th for movable, 9th for fixed, 7th for dual lagna. */
export function getBadhakaLord(lagnaIndex: number): string {
  const li = ((lagnaIndex % 12) + 12) % 12;
  const MOVABLE = new Set([0, 3, 6, 9]);
  const FIXED = new Set([1, 4, 7, 10]);
  let badhakaHouse: number;
  if (MOVABLE.has(li)) badhakaHouse = 11;
  else if (FIXED.has(li)) badhakaHouse = 9;
  else badhakaHouse = 7;
  return getHouseLord(li, badhakaHouse);
}

export function housesRuledByPlanet(lagnaIndex: number, planet: string): number[] {
  const li = ((lagnaIndex % 12) + 12) % 12;
  const out: number[] = [];
  for (let h = 1; h <= 12; h++) {
    if (getHouseLord(li, h) === planet) out.push(h);
  }
  return out;
}

function houseHoraWeight(h: number): number {
  const w: Record<number, number> = {
    1: 56,
    2: 46,
    3: 40,
    4: 46,
    5: 54,
    6: 38,
    7: 46,
    8: 28,
    9: 54,
    10: 46,
    11: 42,
    12: 34,
  };
  return w[h] ?? 40;
}

/** Python `set >= {3,12}` — both 3 and 12 present. */
function hasDusthanaPair312(hs: Set<number>): boolean {
  return hs.has(3) && hs.has(12);
}

/**
 * Lagna-specific HORA_BASE for the seven classical grahas (Python-identical).
 */
export function computeHoraBaseForLagna(lagnaSignIndex: number): Record<string, number> {
  const lagnaIndex = ((lagnaSignIndex % 12) + 12) % 12;
  const badhaka = getBadhakaLord(lagnaIndex);
  const horaBase: Record<string, number> = {};

  for (const planet of SEVEN_GRAHAS) {
    const hsList = housesRuledByPlanet(lagnaIndex, planet);
    const hs = new Set(hsList);
    if (hs.size === 0) {
      horaBase[planet] = 40;
      continue;
    }

    const isLl = hs.has(1);
    const hsArr = Array.from(hs);
    const nonH1Kendra = hsArr.filter((h) => h !== 1 && KENDRA_EX_H1.has(h));
    const tri59 = hsArr.filter((h) => TRI_59.has(h));
    const isYk = nonH1Kendra.length > 0 && tri59.length > 0;

    let s: number;
    if (isLl && isYk) {
      s = 58;
    } else if (isYk) {
      s = 62;
    } else if (isLl) {
      s = 56;
    } else if (hs.has(8)) {
      s = 28;
    } else if (hs.has(9) && (hs.has(6) || hs.has(12))) {
      s = 62;
    } else if (hasDusthanaPair312(hs)) {
      s = 34;
    } else {
      s = Math.max(...hsArr.map((h) => houseHoraWeight(h)));
      if (planet === badhaka) s = Math.min(s, 42);
    }

    horaBase[planet] = Math.max(28, Math.min(62, Math.round(s)));
  }

  return horaBase;
}
