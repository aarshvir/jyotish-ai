/**
 * Hora (planetary hour) arithmetic, computed rather than typed so the table on /hora cannot be
 * wrong. Rules, as classically taught:
 *  - the first hora after sunrise belongs to the ruler of the weekday;
 *  - the horas then follow the fixed order Sun → Venus → Mercury → Moon → Saturn → Jupiter → Mars,
 *    repeating (the descending "Chaldean" order of the planets by speed of motion);
 *  - daytime (sunrise to sunset) is cut into 12 equal horas and night (sunset to next sunrise)
 *    into 12 more, so a hora is about an hour only near the equinoxes.
 */

export const HORA_ORDER = ['Sun', 'Venus', 'Mercury', 'Moon', 'Saturn', 'Jupiter', 'Mars'] as const;
export type Planet = (typeof HORA_ORDER)[number];

/** Weekday → ruling planet. Sunday first. */
export const WEEKDAY_RULERS: ReadonlyArray<readonly [string, Planet]> = [
  ['Sunday', 'Sun'],
  ['Monday', 'Moon'],
  ['Tuesday', 'Mars'],
  ['Wednesday', 'Mercury'],
  ['Thursday', 'Jupiter'],
  ['Friday', 'Venus'],
  ['Saturday', 'Saturn'],
];

/** The 24 horas of a day that starts with `first`: 12 by day, then 12 by night. */
export function horasFrom(first: Planet): Planet[] {
  const start = HORA_ORDER.indexOf(first);
  return Array.from({ length: 24 }, (_, i) => HORA_ORDER[(start + i) % 7]);
}

/** The ruler of the first hora of the NEXT day, derived from the sequence (not looked up). */
export function nextDayFirstHora(first: Planet): Planet {
  const start = HORA_ORDER.indexOf(first);
  return HORA_ORDER[(start + 24) % 7];
}

/** What each planet's hora is traditionally associated with. Tradition, not a measured effect. */
export const HORA_THEMES: Record<Planet, string> = {
  Sun: 'authority, visibility, dealing with officials, confidence',
  Venus: 'relationships, art, comfort, money matters tied to pleasure',
  Mercury: 'communication, study, trade, contracts, travel planning',
  Moon: 'care, the public, family, reflection, routine',
  Saturn: 'discipline, long-term and heavy work, patience (a slow tone, not one for celebrations)',
  Jupiter: 'teaching, advice, learning, finance and ceremonies',
  Mars: 'effort, courage, competition and physical work (a sharp tone; care with conflict)',
};
