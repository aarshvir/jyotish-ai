/**
 * Small, classical Jyotish tables the reveal needs. Pure and tested.
 * Sources: standard Parashari tables (sign lords, exaltation, debilitation, own signs,
 * natural friendships). Houses are whole-sign, as the ephemeris engine returns them.
 */

import type { Role } from '../screens';

export const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const;
export type Sign = (typeof SIGNS)[number];

export type Graha = 'Sun' | 'Moon' | 'Mars' | 'Mercury' | 'Jupiter' | 'Venus' | 'Saturn' | 'Rahu' | 'Ketu';
export type Lord = Exclude<Graha, 'Rahu' | 'Ketu'>;

export const SIGN_LORD: Record<Sign, Lord> = {
  Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon', Leo: 'Sun', Virgo: 'Mercury',
  Libra: 'Venus', Scorpio: 'Mars', Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter',
};

const EXALT: Record<Lord, Sign> = {
  Sun: 'Aries', Moon: 'Taurus', Mars: 'Capricorn', Mercury: 'Virgo', Jupiter: 'Cancer', Venus: 'Pisces', Saturn: 'Libra',
};
const DEBIL: Record<Lord, Sign> = {
  Sun: 'Libra', Moon: 'Scorpio', Mars: 'Cancer', Mercury: 'Pisces', Jupiter: 'Capricorn', Venus: 'Virgo', Saturn: 'Aries',
};

/** Naisargika (natural) relationships: friends and enemies; everything else is neutral. */
const FRIENDS: Record<Lord, Lord[]> = {
  Sun: ['Moon', 'Mars', 'Jupiter'],
  Moon: ['Sun', 'Mercury'],
  Mars: ['Sun', 'Moon', 'Jupiter'],
  Mercury: ['Sun', 'Venus'],
  Jupiter: ['Sun', 'Moon', 'Mars'],
  Venus: ['Mercury', 'Saturn'],
  Saturn: ['Mercury', 'Venus'],
};
const ENEMIES: Record<Lord, Lord[]> = {
  Sun: ['Venus', 'Saturn'],
  Moon: [],
  Mars: ['Mercury'],
  Mercury: ['Moon'],
  Jupiter: ['Mercury', 'Venus'],
  Venus: ['Sun', 'Moon'],
  Saturn: ['Sun', 'Moon', 'Mars'],
};

export function isSign(s: unknown): s is Sign {
  return typeof s === 'string' && (SIGNS as readonly string[]).includes(s);
}

export function signIndex(s: Sign): number {
  return SIGNS.indexOf(s);
}

/** Whole-sign house of `sign` counted from `reference` (1..12). */
export function houseFrom(sign: Sign, reference: Sign): number {
  return ((signIndex(sign) - signIndex(reference) + 12) % 12) + 1;
}

/** The sign on the Nth house from a reference sign. */
export function signOnHouse(reference: Sign, house: number): Sign {
  return SIGNS[(signIndex(reference) + house - 1) % 12];
}

export type Dignity = 'exalted' | 'own' | 'friend' | 'neutral' | 'enemy' | 'debilitated';

export function dignityOf(planet: Lord, sign: Sign): Dignity {
  if (EXALT[planet] === sign) return 'exalted';
  if (DEBIL[planet] === sign) return 'debilitated';
  const lord = SIGN_LORD[sign];
  if (lord === planet) return 'own';
  if (FRIENDS[planet].includes(lord)) return 'friend';
  if (ENEMIES[planet].includes(lord)) return 'enemy';
  return 'neutral';
}

export const DIGNITY_PHRASE: Record<Dignity, string> = {
  exalted: 'exalted',
  own: 'in its own sign',
  friend: "in a friend's sign",
  neutral: 'in a neutral sign',
  enemy: 'in an uneasy sign',
  debilitated: 'debilitated',
};

export type MeritLevel = 'Strong' | 'Moderate' | 'Developing';

/**
 * Past-merit (purva punya) reserve read from the 5th lord: its dignity plus the kind of
 * house it occupies. Kendra/trikona houses support it; 6/8/12 ask more of it.
 */
export function meritLevel(d: Dignity, house: number): { level: MeritLevel; score: number } {
  const base: Record<Dignity, number> = { exalted: 2, own: 2, friend: 1, neutral: 0, enemy: -1, debilitated: -2 };
  const h = [1, 4, 5, 7, 9, 10].includes(house) ? 1 : [6, 8, 12].includes(house) ? -1 : 0;
  const score = base[d] + h;
  return { level: score >= 2 ? 'Strong' : score <= -1 ? 'Developing' : 'Moderate', score };
}

/** Spec §5 S16 match table: Ketu's sign → the archetype it points to. */
export const KETU_ARCHETYPE: Record<Sign, Role> = {
  Aries: 'warrior',
  Scorpio: 'warrior',
  Taurus: 'merchant',
  Libra: 'merchant',
  Gemini: 'scholar',
  Virgo: 'scholar',
  Cancer: 'healer',
  Leo: 'ruler',
  Sagittarius: 'scholar',
  Pisces: 'seeker',
  Capricorn: 'merchant',
  Aquarius: 'seeker',
};

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}
