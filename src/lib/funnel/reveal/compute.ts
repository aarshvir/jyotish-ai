/**
 * S14 + S16: turns the engine's natal chart into the free reveal. Pure — no network —
 * so every sentence can be tested against its source placement (H3) and the H5 lint.
 *
 * Unknown birth time: the engine is run at 12:00 and every house is counted from the
 * Moon's sign (Chandra lagna) instead of the rising sign, and the reveal says so.
 */

import type { NatalChartData } from '@/lib/agents/types';
import type { Role } from '../screens';
import { ROLE_LABEL } from '../screens';
import {
  DIGNITY_PHRASE,
  KETU_ARCHETYPE,
  SIGN_LORD,
  dignityOf,
  houseFrom,
  isSign,
  meritLevel,
  ordinal,
  signOnHouse,
  type Dignity,
  type Lord,
  type MeritLevel,
  type Sign,
} from './astro';
import {
  KETU_CONJ,
  KETU_HOUSE,
  KETU_SIGN,
  LOCKED_DEFAULT,
  LOCKED_ORDER,
  LOCKED_SECTIONS,
  MERIT_TEXT,
  RAHU_CONJ,
  RAHU_HOUSE,
  RAHU_SIGN,
  nakshatraLord,
} from './content';

export interface Sourced {
  text: string;
  /** Chart facts this sentence was derived from — hidden, for QA (spec §6). */
  source_keys: string[];
}

export interface NodeFacts {
  sign: Sign;
  house: number;
  nakshatra: string | null;
  pada: number | null;
  conj: Lord[];
}

export interface RevealData {
  timeKnown: boolean;
  reference: 'lagna' | 'moon';
  referenceSign: Sign;
  lagna: Sign | null;
  moonSign: Sign;
  moonNakshatra: string | null;
  ketu: NodeFacts;
  rahu: NodeFacts;
  fifth: { sign: Sign; lord: Lord; lordSign: Sign; lordHouse: number; dignity: Dignity; level: MeritLevel };
  calcLines: Sourced[];
  header: string;
  cards: { key: 'ketu' | 'rahu' | 'merit'; title: string; badge?: string; paragraphs: Sourced[] }[];
  match: (Sourced & { chosen: Role; archetype: Role; agrees: boolean }) | null;
  locked: string[];
}

export class RevealError extends Error {}

const LORDS: Lord[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

function fmtCoord(v: number, pos: string, neg: string): string {
  return `${Math.abs(v).toFixed(2)}°${v >= 0 ? pos : neg}`;
}

function nodeFacts(chart: NatalChartData, node: 'Rahu' | 'Ketu', reference: Sign): NodeFacts {
  const p = chart.planets?.[node];
  if (!p || !isSign(p.sign)) throw new RevealError(`${node} missing from chart`);
  const conj = LORDS.filter((g) => chart.planets?.[g]?.sign === p.sign);
  return {
    sign: p.sign,
    house: houseFrom(p.sign, reference),
    nakshatra: p.nakshatra ?? null,
    pada: typeof p.nakshatra_pada === 'number' ? p.nakshatra_pada : null,
    conj,
  };
}

function conjSentences(node: 'Ketu' | 'Rahu', conj: Lord[]): Sourced | null {
  if (conj.length === 0) return null;
  const table = node === 'Ketu' ? KETU_CONJ : RAHU_CONJ;
  const parts = conj.slice(0, 2).map((g) => table[g]);
  if (conj.length > 2) parts.push(`${conj.slice(2).join(' and ')} also share${conj.length === 3 ? 's' : ''} this sign.`);
  return { text: parts.join(' '), source_keys: conj.map((g) => `${node.toLowerCase()}.conj=${g}`) };
}

function nakshatraLine(node: 'Ketu' | 'Rahu', f: NodeFacts): Sourced | null {
  if (!f.nakshatra) return null;
  const lord = nakshatraLord(f.nakshatra);
  const pada = f.pada ? `, pada ${f.pada}` : '';
  return {
    text: `${node}’s exact degree falls in ${f.nakshatra} nakshatra${pada}${lord ? `, ruled by ${lord}` : ''}.`,
    source_keys: [`${node.toLowerCase()}.nakshatra=${f.nakshatra}`, ...(f.pada ? [`${node.toLowerCase()}.pada=${f.pada}`] : [])],
  };
}

function houseLead(h: number, reference: 'lagna' | 'moon'): string {
  return `Placed in your ${ordinal(h)} house${reference === 'moon' ? ' (counted from your Moon)' : ''}, `;
}

export interface RevealInput {
  chart: NatalChartData;
  timeKnown: boolean;
  city: string;
  lat: number;
  lng: number;
  focusArea?: string;
  selfRole?: string;
}

export function computeReveal(input: RevealInput): RevealData {
  const { chart, timeKnown } = input;
  const moon = chart.planets?.Moon;
  if (!moon || !isSign(moon.sign)) throw new RevealError('Moon missing from chart');
  const moonSign = moon.sign;
  const lagna = timeKnown && isSign(chart.lagna) ? chart.lagna : null;
  const reference: 'lagna' | 'moon' = lagna ? 'lagna' : 'moon';
  const referenceSign: Sign = lagna ?? moonSign;
  const refKey = `reference=${reference}:${referenceSign}`;

  const ketu = nodeFacts(chart, 'Ketu', referenceSign);
  const rahu = nodeFacts(chart, 'Rahu', referenceSign);

  // 5th lord and its dignity.
  const sign5 = signOnHouse(referenceSign, 5);
  const lord5 = SIGN_LORD[sign5];
  const lordPos = chart.planets?.[lord5];
  if (!lordPos || !isSign(lordPos.sign)) throw new RevealError(`${lord5} missing from chart`);
  const lordSign = lordPos.sign;
  const lordHouse = houseFrom(lordSign, referenceSign);
  const dignity = dignityOf(lord5, lordSign);
  const { level } = meritLevel(dignity, lordHouse);
  const fifthKeys = [refKey, `house5.sign=${sign5}`, `lord5=${lord5}`, `lord5.sign=${lordSign}`, `lord5.house=${lordHouse}`, `lord5.dignity=${dignity}`];

  const moonNakshatra = moon.nakshatra ?? chart.moon_nakshatra ?? null;

  const calcLines: Sourced[] = [
    {
      text: `Locating ${input.city}, ${fmtCoord(input.lat, 'N', 'S')}, ${fmtCoord(input.lng, 'E', 'W')}`,
      source_keys: ['birth.city', 'birth.lat', 'birth.lng'],
    },
    lagna
      ? { text: `Rising sign: ${lagna}`, source_keys: [`lagna=${lagna}`] }
      : { text: `Rising sign: needs a birth time — counting houses from your Moon in ${moonSign}`, source_keys: [`moon.sign=${moonSign}`] },
    ...(moonNakshatra ? [{ text: `Moon nakshatra: ${moonNakshatra}`, source_keys: [`moon.nakshatra=${moonNakshatra}`] }] : []),
    { text: `Ketu: ${ketu.sign}, ${ordinal(ketu.house)} house`, source_keys: [`ketu.sign=${ketu.sign}`, `ketu.house=${ketu.house}`, refKey] },
    { text: `Rahu: ${rahu.sign}, ${ordinal(rahu.house)} house`, source_keys: [`rahu.sign=${rahu.sign}`, `rahu.house=${rahu.house}`, refKey] },
    { text: `5th lord ${lord5}: ${DIGNITY_PHRASE[dignity]}`, source_keys: fifthKeys },
  ];

  const ketuParas: Sourced[] = [
    { text: KETU_SIGN[ketu.sign], source_keys: [`ketu.sign=${ketu.sign}`] },
    { text: houseLead(ketu.house, reference) + KETU_HOUSE[ketu.house], source_keys: [`ketu.house=${ketu.house}`, refKey] },
  ];
  const kc = conjSentences('Ketu', ketu.conj);
  if (kc) ketuParas.push(kc);
  const kn = nakshatraLine('Ketu', ketu);
  if (kn) ketuParas.push(kn);

  const rahuParas: Sourced[] = [
    { text: RAHU_SIGN[rahu.sign], source_keys: [`rahu.sign=${rahu.sign}`] },
    { text: houseLead(rahu.house, reference) + RAHU_HOUSE[rahu.house], source_keys: [`rahu.house=${rahu.house}`, refKey] },
  ];
  const rc = conjSentences('Rahu', rahu.conj);
  if (rc) rahuParas.push(rc);
  const rn = nakshatraLine('Rahu', rahu);
  if (rn) rahuParas.push(rn);

  const meritParas: Sourced[] = [
    {
      text: `Your 5th house${reference === 'moon' ? ' (from your Moon)' : ''} falls in ${sign5}, so its lord is ${lord5}. ${lord5} sits in ${lordSign}, your ${ordinal(lordHouse)} house, ${DIGNITY_PHRASE[dignity]}.`,
      source_keys: fifthKeys,
    },
    { text: MERIT_TEXT[level], source_keys: [...fifthKeys, `lord5.level=${level}`] },
  ];

  let match: RevealData['match'] = null;
  const chosen = input.selfRole as Role | undefined;
  if (chosen && ROLE_LABEL[chosen]) {
    const archetype = KETU_ARCHETYPE[ketu.sign];
    const agrees = archetype === chosen;
    const you = ROLE_LABEL[chosen].en;
    match = {
      chosen,
      archetype,
      agrees,
      text: agrees
        ? `You chose ${you}. Your Ketu says the same.`
        : `You chose ${you}; your Ketu points to ${ROLE_LABEL[archetype].en} — the full blueprint explains the gap.`,
      source_keys: [`ketu.sign=${ketu.sign}`, `ketu.sign.lord=${SIGN_LORD[ketu.sign]}`, `answer.self_role=${chosen}`],
    };
  }

  const order = (input.focusArea && LOCKED_ORDER[input.focusArea]) || LOCKED_DEFAULT;

  return {
    timeKnown: Boolean(lagna),
    reference,
    referenceSign,
    lagna,
    moonSign,
    moonNakshatra,
    ketu,
    rahu,
    fifth: { sign: sign5, lord: lord5, lordSign, lordHouse, dignity, level },
    calcLines,
    header: `Ketu in ${ketu.sign} · ${ordinal(ketu.house)} house | Rahu in ${rahu.sign} · ${ordinal(rahu.house)} house`,
    cards: [
      { key: 'ketu', title: 'What you carry in (Ketu)', paragraphs: ketuParas },
      { key: 'rahu', title: 'What this life asks (Rahu)', paragraphs: rahuParas },
      { key: 'merit', title: 'Past-merit reserve (5th lord)', badge: level, paragraphs: meritParas },
    ],
    match,
    locked: order.map((k) => LOCKED_SECTIONS[k]),
  };
}

export function wordCount(paras: Sourced[]): number {
  return paras.map((p) => p.text).join(' ').split(/\s+/).filter(Boolean).length;
}
