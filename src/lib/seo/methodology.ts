/**
 * How VedicHour calculates — ONE source for the note on every calculator page, the /methodology
 * page and llms-full.txt. Two independent AI models audited the live calculator pages as answer
 * engines (2026-10-11) and both said the same thing: the pages never state their method, so there
 * is nothing verifiable to cite. Every line here was checked against the code that runs
 * (ephemeris-service/main.py, src/lib/agents/RatingAgent.ts); change the code and this file together.
 */

/** ISO date a person last checked these facts against the code. */
export const METHOD_REVIEWED = '2026-10-11';

export interface MethodFact {
  label: string;
  text: string;
}

export const METHOD_FACTS: readonly MethodFact[] = [
  {
    label: 'Planetary positions',
    text: 'Computed by software with the Swiss Ephemeris (pyswisseph, version pinned), not estimated and not written by AI.',
  },
  {
    label: 'Zodiac and ayanamsa',
    text: 'Sidereal zodiac with the Lahiri (Chitrapaksha) ayanamsa, the standard in Jyotish. The service refuses to start unless it is set to Lahiri.',
  },
  {
    label: 'Houses',
    text: 'Whole-sign houses: the rising sign (Lagna) is the 1st house, the next sign the 2nd, and so on. No Placidus or other quadrant houses are used.',
  },
  {
    label: 'Birth time',
    text: 'You enter your local birth date, time and place. The time is converted to universal time using the time-zone offset for that place before anything is calculated.',
  },
  {
    label: 'Dasha',
    text: 'Vimshottari dasha: a 120-year cycle of nine planetary periods (Mahadasha), each split into sub-periods (Antardasha), started from the Moon’s birth star (nakshatra).',
  },
  {
    label: 'Hourly forecast',
    text: 'Eighteen one-hour slots a day, from 06:00 to midnight local time. Each slot gets a score out of 100 from fixed, published tables: the hora ruler, the choghadiya, the house of the rising sign at that hour, the day’s quality (yoga, tithi and nakshatra), and a Rahu Kaal override. The same inputs always give the same score.',
  },
  {
    label: 'Role of AI',
    text: 'AI writes the plain-English explanation of the numbers above. It does not calculate or invent planetary positions or scores.',
  },
  {
    label: 'Limits',
    text: 'The positions are astronomy and can be checked against any accurate ephemeris. How a position is interpreted is tradition, and VedicHour has not been tested for predicting events. Use it for reflection and planning, not as a guarantee.',
  },
];

/** The one-line version for the note under every calculator. */
export const METHOD_SHORT =
  'Positions come from the Swiss Ephemeris, with the sidereal zodiac, the Lahiri ayanamsa and whole-sign houses. The calculation is done by software; AI is only used to explain results.';
