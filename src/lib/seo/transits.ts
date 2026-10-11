import {
  SLOW_PLANETS,
  TRANSIT_SEGMENTS,
  type Segment,
  type SignSlug,
  type SlowPlanet,
} from '@/content/transits';

export { SLOW_PLANETS };
export type { SignSlug, SlowPlanet };

export const SIGN_ORDER: readonly SignSlug[] = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];

export const SIGN_SANSKRIT: Record<SignSlug, string> = {
  aries: 'Mesha', taurus: 'Vrishabha', gemini: 'Mithuna', cancer: 'Karka', leo: 'Simha', virgo: 'Kanya',
  libra: 'Tula', scorpio: 'Vrischika', sagittarius: 'Dhanu', capricorn: 'Makara', aquarius: 'Kumbha', pisces: 'Meena',
};

export const PLANET_SANSKRIT: Record<SlowPlanet, string> = {
  saturn: 'Shani', jupiter: 'Guru', rahu: 'Rahu', ketu: 'Ketu',
};

/** Plain-language topics of each house, counted from the Moon sign. Neutral by design. */
export const HOUSE_TOPICS: Record<number, string> = {
  1: 'self, body and temperament',
  2: 'money, speech and family',
  3: 'effort, courage, siblings and short trips',
  4: 'home, mother and peace of mind',
  5: 'children, study and creativity',
  6: 'daily work, debts and health habits',
  7: 'marriage, partnerships and open dealings',
  8: 'sudden change, shared money and research',
  9: 'luck, teachers, dharma and long journeys',
  10: 'career, status and responsibilities',
  11: 'gains, friends and long-term goals',
  12: 'expenses, sleep, solitude and foreign places',
};

export function isSlowPlanet(p: string): p is SlowPlanet {
  return (SLOW_PLANETS as readonly string[]).includes(p);
}

export function isSign(s: string): s is SignSlug {
  return (SIGN_ORDER as readonly string[]).includes(s);
}

export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Today's calendar date in India (IST), as YYYY-MM-DD. Transit dates in the data are IST dates. */
export function todayIST(now: Date = new Date()): string {
  return new Date(now.getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** 2027-06-03 -> "3 June 2027" (no timezone maths, so it cannot shift a day). */
export function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** House number (1-12) a transit sign occupies counted from a Moon sign. */
export function houseFromMoon(moon: SignSlug, transit: SignSlug): number {
  return ((SIGN_ORDER.indexOf(transit) - SIGN_ORDER.indexOf(moon) + 12) % 12) + 1;
}

/** Moon sign for which the transit sign is the given house from the Moon. */
export function moonSignForHouse(transit: SignSlug, house: number): SignSlug {
  return SIGN_ORDER[(SIGN_ORDER.indexOf(transit) - (house - 1) + 12) % 12];
}

export type Visit = { segments: Segment[]; start: string; end: string };

const DAY = 86400000;
function gapDays(a: string, b: string): number {
  return (Date.parse(b) - Date.parse(a)) / DAY;
}

/** Stays of a planet in a sign. Segments closer than 400 days are one stay (a retrograde dip back). */
export function visitsFor(planet: SlowPlanet, sign: SignSlug): Visit[] {
  const segs = [...TRANSIT_SEGMENTS[planet][sign]].sort((a, b) => a[0].localeCompare(b[0]));
  const visits: Visit[] = [];
  for (const seg of segs) {
    const last = visits[visits.length - 1];
    if (last && gapDays(last.end, seg[0]) < 400) {
      last.segments.push(seg);
      last.end = seg[1];
    } else {
      visits.push({ segments: [seg], start: seg[0], end: seg[1] });
    }
  }
  return visits;
}

export type SignStatus =
  | { kind: 'in'; visit: Visit; segment: Segment }
  | { kind: 'dip'; visit: Visit }
  | { kind: 'next'; visit: Visit }
  | { kind: 'past'; visit: Visit }
  | { kind: 'none' };

/** Where a planet stands relative to one sign on a given IST date. */
export function statusFor(planet: SlowPlanet, sign: SignSlug, today: string): SignStatus {
  const visits = visitsFor(planet, sign);
  for (const v of visits) {
    const seg = v.segments.find((s) => today >= s[0] && today < s[1]);
    if (seg) return { kind: 'in', visit: v, segment: seg };
    if (today >= v.start && today < v.end) return { kind: 'dip', visit: v };
  }
  const next = visits.find((v) => v.start > today);
  if (next) return { kind: 'next', visit: next };
  const past = [...visits].reverse().find((v) => v.end <= today);
  return past ? { kind: 'past', visit: past } : { kind: 'none' };
}

export type CurrentSign = { sign: SignSlug; since: string; until: string };

/** The sign a planet is in on a given date, with the segment's start and end. Null outside the data range. */
export function currentSign(planet: SlowPlanet, today: string): CurrentSign | null {
  for (const sign of SIGN_ORDER) {
    const seg = TRANSIT_SEGMENTS[planet][sign].find((s) => today >= s[0] && today < s[1]);
    if (seg) return { sign, since: seg[0], until: seg[1] };
  }
  return null;
}

/** Human description of one stay, e.g. "29 March 2025 to 3 June 2027, and again 20 October 2027 to 23 February 2028". */
export function describeVisit(v: Visit): string {
  const parts = v.segments.map((s) => `${fmtDate(s[0])} to ${fmtDate(s[1])}`);
  return parts.length === 1 ? parts[0] : `${parts[0]}, and again ${parts.slice(1).join(' and again ')}`;
}

/** Moon signs currently in Sade Sati (Saturn 12th, 1st or 2nd from the Moon) and in dhaiya (4th or 8th). */
export function saturnPressure(saturnSign: SignSlug) {
  return {
    sadeSati: [12, 1, 2].map((h) => ({ house: h, sign: moonSignForHouse(saturnSign, h) })),
    dhaiya: [4, 8].map((h) => ({ house: h, sign: moonSignForHouse(saturnSign, h) })),
  };
}
