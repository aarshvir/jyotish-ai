/**
 * The planetary ingresses (a planet moving into a new sign) written into each month's prompt, so the
 * monthly commentary names real movements instead of guessing them from one reference sky.
 *
 * Moved out of the report orchestrator unchanged so that scripts (the sample-report generator, the
 * cost probe) build the monthly prompts exactly the way a real report does.
 */

import { calendarMonthAfter } from '@/lib/time/localTime';

// Lahiri (Chitrapaksha) sidereal ingresses, computed with pyswisseph 2.10.03 in
// SIDM_LAHIRI (first UT day in the new sign), covering the forecast window. The
// previous hand-typed table was wrong for most planets (e.g. "Mars enters Scorpio
// 1 Sep 2026" when Mars was in Gemini, Jupiter "in Taurus" when it was in Cancer),
// and those claims were written into customers' monthly forecasts.
export const KNOWN_INGRESSES_2026 = [
  { planet: 'Saturn',  sign: 'Pisces',      date: '2025-03-30', note: 'Saturn in Pisces — discipline around endings, faith and letting go' },
  { planet: 'Rahu',    sign: 'Aquarius',    date: '2025-05-19', note: 'Rahu in Aquarius — ambition toward networks and technology' },
  { planet: 'Ketu',    sign: 'Leo',         date: '2025-05-19', note: 'Ketu in Leo — detachment from ego and recognition' },
  { planet: 'Mars',    sign: 'Capricorn',   date: '2026-01-16', note: 'Mars exalted in Capricorn — peak professional drive' },
  { planet: 'Mars',    sign: 'Aquarius',    date: '2026-02-23', note: 'Mars in Aquarius — drive toward groups, systems and technology' },
  { planet: 'Mars',    sign: 'Pisces',      date: '2026-04-02', note: 'Mars in Pisces — quieter, behind-the-scenes effort' },
  { planet: 'Mars',    sign: 'Aries',       date: '2026-05-11', note: 'Mars in Aries (own sign) — bold initiative, fast action' },
  { planet: 'Mars',    sign: 'Taurus',      date: '2026-06-21', note: 'Mars in Taurus — steady effort on money and assets' },
  { planet: 'Jupiter', sign: 'Cancer',      date: '2026-06-02', note: 'Jupiter exalted in Cancer — growth through home, care and wisdom' },
  { planet: 'Mars',    sign: 'Gemini',      date: '2026-08-03', note: 'Mars in Gemini — busy communication, short trips, negotiations' },
  { planet: 'Mars',    sign: 'Cancer',      date: '2026-09-18', note: 'Mars debilitated in Cancer — emotional reactions, home matters' },
  { planet: 'Jupiter', sign: 'Leo',         date: '2026-10-31', note: 'Jupiter in Leo — confidence, leadership, creative growth' },
  { planet: 'Mars',    sign: 'Leo',         date: '2026-11-13', note: 'Mars in Leo — bold self-expression, career momentum' },
  { planet: 'Rahu',    sign: 'Capricorn',   date: '2026-12-06', note: 'Rahu in Capricorn — ambition toward status and structure' },
  { planet: 'Ketu',    sign: 'Cancer',      date: '2026-12-06', note: 'Ketu in Cancer — detachment around home and emotional ties' },
  { planet: 'Jupiter', sign: 'Cancer',      date: '2027-01-25', note: 'Jupiter moves back into Cancer (retrograde)' },
  { planet: 'Sun',     sign: 'Capricorn',   date: '2026-01-14', note: 'Sun in Capricorn — duty, structure, long-term goals' },
  { planet: 'Sun',     sign: 'Aquarius',    date: '2026-02-13', note: 'Sun in Aquarius — community, ideas, networks' },
  { planet: 'Sun',     sign: 'Pisces',      date: '2026-03-15', note: 'Sun in Pisces — reflection, rest, spiritual focus' },
  { planet: 'Sun',     sign: 'Aries',       date: '2026-04-14', note: 'Sun enters Aries (sidereal) — solar new year, identity surge' },
  { planet: 'Sun',     sign: 'Taurus',      date: '2026-05-15', note: 'Sun in Taurus — stabilisation, financial focus' },
  { planet: 'Sun',     sign: 'Gemini',      date: '2026-06-15', note: 'Sun in Gemini — communication, learning peaks' },
  { planet: 'Sun',     sign: 'Cancer',      date: '2026-07-17', note: 'Sun in Cancer — home, emotions, nurturing' },
  { planet: 'Sun',     sign: 'Leo',         date: '2026-08-17', note: 'Sun in Leo (own sign) — leadership, authority at peak' },
  { planet: 'Sun',     sign: 'Virgo',       date: '2026-09-17', note: 'Sun in Virgo — analysis, health, service' },
  { planet: 'Sun',     sign: 'Libra',       date: '2026-10-18', note: 'Sun debilitated in Libra — compromise, partnership focus' },
  { planet: 'Sun',     sign: 'Scorpio',     date: '2026-11-17', note: 'Sun in Scorpio — depth, hidden matters surface' },
  { planet: 'Sun',     sign: 'Sagittarius', date: '2026-12-16', note: 'Sun in Sagittarius — expansion, optimism, dharma' },
  { planet: 'Sun',     sign: 'Capricorn',   date: '2027-01-15', note: 'Sun in Capricorn — duty, structure, long-term goals' },
];

const SIGNS_WHEEL = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

export function houseFromLagna(sign: string, lagnaSign: string): number {
  const li = SIGNS_WHEEL.indexOf(lagnaSign);
  const si = SIGNS_WHEEL.indexOf(sign);
  if (li < 0 || si < 0) return 0;
  return ((si - li + 12) % 12) + 1;
}

type PlanetPos = { sign: string; house: number; degree: number };
type PlanetPositions = { planets?: Record<string, PlanetPos> };

export interface MonthWithHints {
  month_label: string;
  month_index: number;
  key_transits_hint: string;
}

/**
 * Twelve calendar months from the first forecast day, each with the ingresses that fall in it: the table
 * above, plus any Sun, Mars, Jupiter or Saturn sign change the engine's own 30 days show.
 */
export function monthsWithIngressHints(
  forecastDays: { date: string; planet_positions?: unknown }[],
  lagna: string,
  count = 12,
): MonthWithHints[] {
  const ingressByMonth: Record<string, string[]> = {};
  for (const ing of KNOWN_INGRESSES_2026) {
    const ym = ing.date.substring(0, 7);
    const house = houseFromLagna(ing.sign, lagna);
    const d = new Date(ing.date);
    const dayStr = d.toLocaleString('default', { month: 'short', day: 'numeric' });
    let hint = `${ing.planet} enters ${ing.sign} ${dayStr}`;
    if (house > 0) hint += ` (H${house} for ${lagna} lagna)`;
    if (!ingressByMonth[ym]) ingressByMonth[ym] = [];
    ingressByMonth[ym].push(hint);
  }
  for (let di = 1; di < forecastDays.length; di++) {
    const prev = forecastDays[di - 1];
    const curr = forecastDays[di];
    const pp = curr.planet_positions as PlanetPositions | undefined;
    const prevPp = prev.planet_positions as PlanetPositions | undefined;
    if (!pp?.planets || !prevPp?.planets) continue;
    for (const planet of ['Sun', 'Mars', 'Jupiter', 'Saturn']) {
      const currSign = pp.planets[planet]?.sign;
      const prevSign = prevPp.planets[planet]?.sign;
      if (currSign && prevSign && currSign !== prevSign) {
        const ym = curr.date.substring(0, 7);
        const house = houseFromLagna(currSign, lagna);
        const d = new Date(curr.date);
        const dayStr = d.toLocaleString('default', { month: 'short', day: 'numeric' });
        let hint = `${planet} enters ${currSign} ${dayStr}`;
        if (house > 0) hint += ` (H${house} for ${lagna} lagna)`;
        if (!ingressByMonth[ym]) ingressByMonth[ym] = [];
        if (!ingressByMonth[ym].some((h) => h.startsWith(`${planet} enters ${currSign}`))) {
          ingressByMonth[ym].push(hint);
        }
      }
    }
  }
  return Array.from({ length: count }, (_, i) => {
    const slot = calendarMonthAfter(forecastDays[0].date, i);
    const ym = slot?.ym ?? '';
    const hints = ingressByMonth[ym] ?? [];
    return { month_label: slot?.label ?? '', month_index: i, key_transits_hint: hints.join('; ') };
  });
}
