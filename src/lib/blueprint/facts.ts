/**
 * Karmic Blueprint, step 1: engine facts. Pure — no network, no clock, no model.
 *
 * Everything the report says about the chart is derived here from the ephemeris engine's
 * natal chart. Each fact carries a stable key; narrative paragraphs must cite the keys they
 * rest on (`source_keys`), and a key that does not exist here is rejected.
 *
 * Houses are whole-sign, counted from the rising sign. When the birth time is unknown the
 * engine runs at noon and houses are counted from the Moon instead (Chandra lagna); the
 * facts say so, and nothing that depends on the exact rising sign is produced.
 */

import type { NatalChartData } from '@/lib/agents/types';
import {
  DIGNITY_PHRASE,
  SIGN_LORD,
  dignityOf,
  houseFrom,
  isSign,
  meritLevel,
  ordinal,
  signIndex,
  signOnHouse,
  type Dignity,
  type Graha,
  type Lord,
  type MeritLevel,
  type Sign,
} from '@/lib/funnel/reveal/astro';
import { nakshatraLord } from '@/lib/funnel/reveal/content';

export const LORDS: Lord[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
export const GRAHAS: Graha[] = [...LORDS, 'Rahu', 'Ketu'];

/** Graha drishti (Parashari): houses counted from the aspecting planet, 7th for all. */
const ASPECT_OFFSETS: Record<Lord, number[]> = {
  Sun: [7],
  Moon: [7],
  Mars: [4, 7, 8],
  Mercury: [7],
  Jupiter: [5, 7, 9],
  Venus: [7],
  Saturn: [3, 7, 10],
};

export interface Fact {
  key: string;
  text: string;
}

export interface PlanetFact {
  name: Graha;
  sign: Sign;
  house: number;
  degree: number;
  nakshatra: string | null;
  pada: number | null;
  retrograde: boolean;
  dignity: Dignity | null;
  /** Absolute sidereal longitude 0–360. */
  lon: number;
}

export interface HouseFact {
  house: number;
  sign: Sign;
  lord: Lord;
  lordSign: Sign;
  lordHouse: number;
  lordDignity: Dignity;
  occupants: Graha[];
  aspectedBy: Lord[];
}

export interface NodeDeep {
  node: 'Rahu' | 'Ketu';
  sign: Sign;
  house: number;
  degree: number;
  nakshatra: string | null;
  pada: number | null;
  nakshatraLord: string | null;
  conj: Lord[];
  aspectedBy: Lord[];
  dispositor: Lord;
  dispositorSign: Sign;
  dispositorHouse: number;
  dispositorDignity: Dignity;
}

export interface DashaPeriod {
  planet: string;
  start: string;
  end: string;
}

export interface DashaFacts {
  maha: DashaPeriod;
  antar: DashaPeriod | null;
  /** The next sub-period (or the first of the next major period). */
  nextAntar: DashaPeriod | null;
  nextMaha: DashaPeriod | null;
  /** Date the current sub-period ends, i.e. the next change. */
  nextChange: string | null;
  mahaLord: DashaLordFacts | null;
  antarLord: DashaLordFacts | null;
}

export interface DashaLordFacts {
  planet: Graha;
  sign: Sign;
  house: number;
  dignity: Dignity | null;
  rules: number[];
  /** Planets sharing its sign. */
  conj: Graha[];
  /** Planets aspecting it. */
  aspectedBy: Lord[];
}

export interface BlueprintFacts {
  today: string;
  reference: 'lagna' | 'moon';
  referenceSign: Sign;
  timeConfidence: 'exact' | 'approx' | 'unknown';
  lagna: { sign: Sign; degree: number } | null;
  moonSign: Sign;
  moonNakshatra: string | null;
  moonPada: number | null;
  sunSign: Sign;
  planets: Record<Graha, PlanetFact>;
  houses: HouseFact[];
  ketu: NodeDeep;
  rahu: NodeDeep;
  fifth: HouseFact & { level: MeritLevel };
  ninth: HouseFact;
  dasha: DashaFacts | null;
  keys: Fact[];
}

export class BlueprintFactsError extends Error {}

export const refName = (reference: 'lagna' | 'moon') => (reference === 'lagna' ? 'rising sign' : 'Moon sign');
export const list = (xs: string[]): string => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

function planetFact(chart: NatalChartData, name: Graha, ref: Sign): PlanetFact {
  const p = chart.planets?.[name];
  if (!p || !isSign(p.sign)) throw new BlueprintFactsError(`${name} missing from chart`);
  const degree = Number(p.degree);
  return {
    name,
    sign: p.sign,
    house: houseFrom(p.sign, ref),
    degree,
    nakshatra: p.nakshatra ?? null,
    pada: typeof p.nakshatra_pada === 'number' ? p.nakshatra_pada : null,
    retrograde: Boolean(p.is_retrograde),
    dignity: (LORDS as string[]).includes(name) ? dignityOf(name as Lord, p.sign) : null,
    lon: signIndex(p.sign) * 30 + (Number.isFinite(degree) ? degree : 0),
  };
}

/** Planets that aspect a sign (by graha drishti), not counting those sitting in it. */
export function aspectsOnSign(target: Sign, planets: Record<Graha, PlanetFact>): Lord[] {
  const out: Lord[] = [];
  for (const g of LORDS) {
    const from = planets[g].sign;
    if (from === target) continue;
    const houseFromG = houseFrom(target, from);
    if (ASPECT_OFFSETS[g].includes(houseFromG)) out.push(g);
  }
  return out;
}

function houseFact(n: number, ref: Sign, planets: Record<Graha, PlanetFact>): HouseFact {
  const sign = signOnHouse(ref, n);
  const lord = SIGN_LORD[sign];
  const lp = planets[lord];
  return {
    house: n,
    sign,
    lord,
    lordSign: lp.sign,
    lordHouse: lp.house,
    lordDignity: dignityOf(lord, lp.sign),
    occupants: GRAHAS.filter((g) => planets[g].sign === sign),
    aspectedBy: aspectsOnSign(sign, planets),
  };
}

function nodeDeep(node: 'Rahu' | 'Ketu', planets: Record<Graha, PlanetFact>): NodeDeep {
  const p = planets[node];
  const disp = SIGN_LORD[p.sign];
  const dp = planets[disp];
  return {
    node,
    sign: p.sign,
    house: p.house,
    degree: p.degree,
    nakshatra: p.nakshatra,
    pada: p.pada,
    nakshatraLord: nakshatraLord(p.nakshatra),
    conj: LORDS.filter((g) => planets[g].sign === p.sign),
    aspectedBy: aspectsOnSign(p.sign, planets),
    dispositor: disp,
    dispositorSign: dp.sign,
    dispositorHouse: dp.house,
    dispositorDignity: dignityOf(disp, dp.sign),
  };
}

function inRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

function lordFacts(planet: string, planets: Record<Graha, PlanetFact>, ref: Sign): DashaLordFacts | null {
  if (!(GRAHAS as string[]).includes(planet)) return null;
  const g = planet as Graha;
  const p = planets[g];
  const rules = (LORDS as string[]).includes(g)
    ? Array.from({ length: 12 }, (_, i) => i + 1).filter((h) => SIGN_LORD[signOnHouse(ref, h)] === g)
    : [];
  return {
    planet: g,
    sign: p.sign,
    house: p.house,
    dignity: p.dignity,
    rules,
    conj: GRAHAS.filter((o) => o !== g && planets[o].sign === p.sign),
    aspectedBy: aspectsOnSign(p.sign, planets),
  };
}

export function dashaAt(chart: NatalChartData, today: string, planets: Record<Graha, PlanetFact>, ref: Sign): DashaFacts | null {
  const seq = Array.isArray(chart.dasha_sequence) ? chart.dasha_sequence : [];
  const mi = seq.findIndex((d) => inRange(today, d.start_date, d.end_date));
  if (mi < 0) return null;
  const m = seq[mi];
  const subs = Array.isArray(m.antardasha) ? m.antardasha : [];
  const ai = subs.findIndex((a) => inRange(today, a.start_date, a.end_date));
  const antar = ai >= 0 ? subs[ai] : null;
  const nextSub = ai >= 0 && ai + 1 < subs.length ? subs[ai + 1] : seq[mi + 1]?.antardasha?.[0] ?? null;
  const nextMahaRaw = seq[mi + 1] ?? null;
  const asPeriod = (x: { planet: string; start_date: string; end_date: string } | null): DashaPeriod | null =>
    x ? { planet: x.planet, start: x.start_date, end: x.end_date } : null;
  return {
    maha: { planet: m.planet, start: m.start_date, end: m.end_date },
    antar: asPeriod(antar),
    nextAntar: asPeriod(nextSub),
    nextMaha: asPeriod(nextMahaRaw),
    nextChange: antar ? antar.end_date : m.end_date,
    mahaLord: lordFacts(m.planet, planets, ref),
    antarLord: antar ? lordFacts(antar.planet, planets, ref) : null,
  };
}

const dig = (d: Dignity | null) => (d ? DIGNITY_PHRASE[d] : '');

export interface FactsInput {
  chart: NatalChartData;
  timeConfidence: 'exact' | 'approx' | 'unknown';
  /** ISO date of "today" in the reader's timezone. */
  today: string;
}

export function buildBlueprintFacts({ chart, timeConfidence, today }: FactsInput): BlueprintFacts {
  const moon = chart.planets?.Moon;
  if (!moon || !isSign(moon.sign)) throw new BlueprintFactsError('Moon missing from chart');
  const lagnaKnown = timeConfidence !== 'unknown' && isSign(chart.lagna);
  const reference: 'lagna' | 'moon' = lagnaKnown ? 'lagna' : 'moon';
  const ref: Sign = lagnaKnown ? (chart.lagna as Sign) : moon.sign;

  const planets = Object.fromEntries(GRAHAS.map((g) => [g, planetFact(chart, g, ref)])) as Record<Graha, PlanetFact>;
  const houses = Array.from({ length: 12 }, (_, i) => houseFact(i + 1, ref, planets));
  const ketu = nodeDeep('Ketu', planets);
  const rahu = nodeDeep('Rahu', planets);

  const fifthBase = houses[4];
  const fifth = { ...fifthBase, level: meritLevel(fifthBase.lordDignity, fifthBase.lordHouse).level };
  const ninth = houses[8];
  const dasha = dashaAt(chart, today, planets, ref);

  const keys: Fact[] = [];
  const add = (key: string, text: string) => keys.push({ key, text });

  add('reference', `Houses are counted from the ${refName(reference)}, ${ref}${reference === 'moon' ? ' (the birth time is not known well enough to fix the rising sign)' : ''}.`);
  if (lagnaKnown) add('lagna', `Rising sign: ${chart.lagna} at ${Number(chart.lagna_degree).toFixed(1)}°.`);
  add('moon', `Moon: ${moon.sign}${moon.nakshatra ? `, ${moon.nakshatra} nakshatra${moon.nakshatra_pada ? ` pada ${moon.nakshatra_pada}` : ''}` : ''}.`);
  add('sun', `Sun: ${planets.Sun.sign}, ${ordinal(planets.Sun.house)} house.`);

  for (const n of [ketu, rahu]) {
    const k = n.node.toLowerCase();
    add(`${k}.sign`, `${n.node} is in ${n.sign}.`);
    add(`${k}.house`, `${n.node} is in the ${ordinal(n.house)} house.`);
    if (n.nakshatra) add(`${k}.nakshatra`, `${n.node} is in ${n.nakshatra} nakshatra${n.pada ? `, pada ${n.pada}` : ''}${n.nakshatraLord ? `, ruled by ${n.nakshatraLord}` : ''}.`);
    add(
      `${k}.conj`,
      n.conj.length ? `${list(n.conj)} ${n.conj.length === 1 ? 'shares' : 'share'} ${n.node}’s sign.` : `No other planet shares ${n.node}’s sign.`,
    );
    add(
      `${k}.aspects`,
      n.aspectedBy.length ? `${list(n.aspectedBy)} ${n.aspectedBy.length === 1 ? 'aspects' : 'aspect'} ${n.node}’s sign.` : `No planet aspects ${n.node}’s sign.`,
    );
    add(
      `${k}.dispositor`,
      `${n.node}’s sign ${n.sign} is ruled by ${n.dispositor}, which sits in ${n.dispositorSign} (${ordinal(n.dispositorHouse)} house), ${dig(n.dispositorDignity)}.`,
    );
  }
  add('axis', `The Rahu–Ketu axis runs across your ${ordinal(rahu.house)} and ${ordinal(ketu.house)} houses.`);

  for (const h of [fifth, ninth]) {
    const k = `h${h.house}`;
    add(`${k}.sign`, `Your ${ordinal(h.house)} house is ${h.sign}, ruled by ${h.lord}.`);
    add(`${k}.lord`, `${h.lord}, lord of the ${ordinal(h.house)}, sits in ${h.lordSign} (${ordinal(h.lordHouse)} house), ${dig(h.lordDignity)}.`);
    add(`${k}.occupants`, h.occupants.length ? `${list(h.occupants)} ${h.occupants.length === 1 ? 'is' : 'are'} in your ${ordinal(h.house)} house.` : `No planet sits in your ${ordinal(h.house)} house.`);
    add(`${k}.aspects`, h.aspectedBy.length ? `${list(h.aspectedBy)} ${h.aspectedBy.length === 1 ? 'aspects' : 'aspect'} your ${ordinal(h.house)} house.` : `No planet aspects your ${ordinal(h.house)} house.`);
  }
  add('h5.merit', `The 5th-lord reserve reads as ${fifth.level.toLowerCase()} (lord ${dig(fifth.lordDignity)}, in the ${ordinal(fifth.lordHouse)} house).`);

  if (dasha) {
    add('dasha.maha', `Major period: ${dasha.maha.planet}, ${dasha.maha.start} to ${dasha.maha.end}.`);
    if (dasha.antar) add('dasha.antar', `Sub-period: ${dasha.antar.planet}, ${dasha.antar.start} to ${dasha.antar.end}.`);
    if (dasha.nextChange) {
      const next = dasha.nextAntar;
      const major = !dasha.antar || dasha.antar.end >= dasha.maha.end;
      add(
        'dasha.next',
        `The current ${major ? 'major period' : 'sub-period'} ends on ${dasha.nextChange}${next ? `; the ${next.planet} ${major ? 'major period' : 'sub-period'} follows` : ''}.`,
      );
    }
    for (const [tag, l] of [['maha', dasha.mahaLord], ['antar', dasha.antarLord]] as const) {
      if (!l) continue;
      add(
        `dasha.${tag}.lord`,
        `${l.planet}${l.rules.length ? ` rules your ${list(l.rules.map(ordinal))} ${l.rules.length === 1 ? 'house' : 'houses'} and` : ''} sits in ${l.sign} (${ordinal(l.house)} house)${l.dignity ? `, ${dig(l.dignity)}` : ''}${l.conj.length ? `, with ${list(l.conj)}` : ''}${l.aspectedBy.length ? `, aspected by ${list(l.aspectedBy)}` : ''}.`,
      );
    }
  }

  return {
    today,
    reference,
    referenceSign: ref,
    timeConfidence,
    lagna: lagnaKnown ? { sign: chart.lagna as Sign, degree: Number(chart.lagna_degree) } : null,
    moonSign: moon.sign,
    moonNakshatra: moon.nakshatra ?? chart.moon_nakshatra ?? null,
    moonPada: typeof moon.nakshatra_pada === 'number' ? moon.nakshatra_pada : null,
    sunSign: planets.Sun.sign,
    planets,
    houses,
    ketu,
    rahu,
    fifth,
    ninth,
    dasha,
    keys,
  };
}

/** House facts for the houses that read an area of life, with their keys added to the list. */
export function areaFacts(facts: BlueprintFacts, houses: number[]): Fact[] {
  const out: Fact[] = [];
  for (const n of houses) {
    const h = facts.houses[n - 1];
    out.push({ key: `area.h${n}.sign`, text: `Your ${ordinal(n)} house is ${h.sign}, ruled by ${h.lord}.` });
    out.push({
      key: `area.h${n}.lord`,
      text: `${h.lord}, lord of the ${ordinal(n)}, sits in ${h.lordSign} (${ordinal(h.lordHouse)} house), ${dig(h.lordDignity)}.`,
    });
    out.push({
      key: `area.h${n}.occupants`,
      text: h.occupants.length ? `${list(h.occupants)} ${h.occupants.length === 1 ? 'is' : 'are'} in your ${ordinal(n)} house.` : `No planet sits in your ${ordinal(n)} house.`,
    });
  }
  return out;
}
