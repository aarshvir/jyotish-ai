/**
 * Karmic Blueprint, step 4: the calculated skeleton of every section.
 *
 * Each builder returns the section's calculated paragraphs and table (kind "fact", plus the
 * traditional reading from our own library, kind "interpretation") and a NarrativeSpec
 * saying what the model may add on top. If the model's addition cannot be cleared by the
 * content lint, the section ships as built here, which is already a complete reading.
 */

import { ROLE_LABEL } from '@/lib/funnel/screens';
import { DIGNITY_PHRASE, KETU_ARCHETYPE, ordinal, SIGN_LORD, type Graha } from '@/lib/funnel/reveal/astro';
import { KETU_HOUSE, KETU_SIGN, MERIT_TEXT, RAHU_HOUSE, RAHU_SIGN } from '@/lib/funnel/reveal/content';
import { AREA_NAME, type Area, type SeekerProfile } from '@/lib/personalization/profile';
import { SITUATIONS } from '@/lib/personalization/situations';
import { longDate } from '@/lib/personalization/selections';
import { addDays, daysBetween } from '@/lib/personalization/eventDate';
import type { GridDay } from './deps';
import { areaFacts, list, refName, type BlueprintFacts, type Fact, type NodeDeep } from './facts';
import { AXIS_THEME, DASHA_LORD_NOTE, DEBT_PRACTICES, HOUSE_THEME, LIMITS_FIXED, NAKSHATRA_NOTE } from './library';
import { titleFor, whyFor, type BlueprintPlan, type PlanKind, type WhyContext } from './personalize';
import { dayFacts, dayRows, dayTable, shortDate } from './days';
import { modelSafe } from './lint';
import { sensitivityParagraphs, type TimeSensitivity } from './sensitivity';
import type { BlueprintParagraph, BlueprintSection, BlueprintTable, NarrativeSpec, NodalWindow, SectionId } from './types';

export interface BuildCtx {
  name: string;
  profile: SeekerProfile;
  facts: BlueprintFacts;
  plan: BlueprintPlan;
  planKind: PlanKind;
  sensitivity: TimeSensitivity;
  /** Every window found in the next year, and the few chosen for the report. */
  allWindows: NodalWindow[];
  windows: NodalWindow[];
  /** Grid days around the event date, when it is dated and in range. */
  eventGrid: GridDay[] | null;
  eventDasha: { maha: string; antar: string | null } | null;
  /** The next 30 days, when the add-on was bought. */
  thirtyGrid: GridDay[] | null;
  today: string;
}

export interface SectionBuild {
  section: BlueprintSection;
  narrative: NarrativeSpec | null;
}

const AREA_KARAKAS: Record<Exclude<Area, 'curious'>, Graha[]> = {
  career: ['Saturn', 'Sun'],
  love: ['Venus', 'Jupiter'],
  family: ['Moon', 'Jupiter'],
  health: ['Sun', 'Moon'],
  trust: ['Mercury', 'Jupiter'],
  business: ['Mercury', 'Saturn'],
};

const para = (kind: BlueprintParagraph['kind'], text: string, source_keys: string[]): BlueprintParagraph => ({ kind, text, source_keys });
const keyed = (facts: Fact[], keys: string[]) => facts.filter((f) => keys.includes(f.key));
const byPrefix = (facts: Fact[], ...prefixes: string[]) => facts.filter((f) => prefixes.some((p) => f.key === p || f.key.startsWith(`${p}.`)));

function head(ctx: BuildCtx, id: SectionId): Omit<BlueprintSection, 'paragraphs'> {
  const why: WhyContext = { profile: ctx.profile, facts: ctx.facts, plan: ctx.plan, windows: ctx.windows, eventDasha: ctx.eventDasha };
  return { id, title: titleFor(id, ctx.profile), why: whyFor(id, why) };
}

function planetLine(f: BlueprintFacts, g: Graha): Fact {
  const p = f.planets[g];
  return {
    key: `planet.${g.toLowerCase()}`,
    text: `${g} is in ${p.sign} (${ordinal(p.house)} house)${p.dignity ? `, ${DIGNITY_PHRASE[p.dignity]}` : ''}${p.retrograde ? ', moving retrograde' : ''}.`,
  };
}

// ── snapshot ────────────────────────────────────────────────────────────────

function snapshot(ctx: BuildCtx): SectionBuild {
  const f = ctx.facts;
  const sens = sensitivityParagraphs(ctx.sensitivity);
  const rows: string[][] = [];
  rows.push(f.lagna ? ['Rising sign', `${f.lagna.sign} (${f.lagna.degree.toFixed(1)}°)`] : ['Rising sign', 'Not used (birth time not known)']);
  rows.push(['Houses counted from', `${refName(f.reference)}: ${f.referenceSign}`]);
  rows.push(['Moon', `${f.moonSign}${f.moonNakshatra ? `, ${f.moonNakshatra}${f.moonPada ? ` pada ${f.moonPada}` : ''}` : ''}`]);
  rows.push(['Sun', `${f.sunSign} (${ordinal(f.planets.Sun.house)} house)`]);
  rows.push(['Ketu', `${f.ketu.sign}, ${ordinal(f.ketu.house)} house${f.ketu.nakshatra ? `, ${f.ketu.nakshatra}` : ''}`]);
  rows.push(['Rahu', `${f.rahu.sign}, ${ordinal(f.rahu.house)} house${f.rahu.nakshatra ? `, ${f.rahu.nakshatra}` : ''}`]);
  if (f.dasha) {
    rows.push(['Major period', `${f.dasha.maha.planet}, to ${longDate(f.dasha.maha.end)}`]);
    if (f.dasha.antar) rows.push(['Sub-period', `${f.dasha.antar.planet}, to ${longDate(f.dasha.antar.end)}`]);
  }
  const table: BlueprintTable = { caption: 'The calculated base for everything that follows', head: ['', ''], rows };
  const paragraphs: BlueprintParagraph[] = [
    para('fact', 'Positions use the sidereal zodiac with the Lahiri ayanamsa and whole-sign houses, calculated with the Swiss Ephemeris. They are measurements, not opinions: any astrologer using the same conventions will get the same table.', ['reference']),
    ...sens.paragraphs,
  ];
  return { section: { ...head(ctx, 'snapshot'), paragraphs, table }, narrative: null };
}

// ── Ketu and Rahu ──────────────────────────────────────────────────────────

function nodeFactParas(n: NodeDeep, tag: 'ketu' | 'rahu'): BlueprintParagraph[] {
  const out: BlueprintParagraph[] = [];
  out.push(
    para(
      'fact',
      `${n.node} is in ${n.sign}, in your ${ordinal(n.house)} house${n.nakshatra ? `, in ${n.nakshatra} nakshatra${n.pada ? ` (pada ${n.pada})` : ''}${n.nakshatraLord ? `, which is ruled by ${n.nakshatraLord}` : ''}` : ''}.`,
      [`${tag}.sign`, `${tag}.house`, ...(n.nakshatra ? [`${tag}.nakshatra`] : [])],
    ),
  );
  const sits = n.conj.length ? `${list(n.conj)} ${n.conj.length === 1 ? 'shares' : 'share'} its sign` : 'no planet shares its sign';
  const asp = n.aspectedBy.length ? `${list(n.aspectedBy)} ${n.aspectedBy.length === 1 ? 'aspects' : 'aspect'} it` : 'no planet aspects it';
  out.push(
    para(
      'fact',
      `Around ${n.node}: ${sits}, and ${asp}. The ruler of ${n.sign} is ${n.dispositor}, which sits in ${n.dispositorSign} (${ordinal(n.dispositorHouse)} house), ${DIGNITY_PHRASE[n.dispositorDignity]}. In Jyotish a node behaves a good deal like the planet that rules its sign, so that is where its effects are read to land.`,
      [`${tag}.conj`, `${tag}.aspects`, `${tag}.dispositor`],
    ),
  );
  if (n.nakshatra && NAKSHATRA_NOTE[n.nakshatra]) {
    out.push(para('interpretation', `Traditionally ${n.nakshatra} is read as ${NAKSHATRA_NOTE[n.nakshatra]}. That colours how ${n.node} expresses itself in your chart.`, [`${tag}.nakshatra`]));
  }
  return out;
}

function ketu(ctx: BuildCtx): SectionBuild {
  const f = ctx.facts;
  const paragraphs = nodeFactParas(f.ketu, 'ketu');
  if (ctx.profile.selfRole) {
    const chosen = ctx.profile.selfRole;
    const archetype = KETU_ARCHETYPE[f.ketu.sign];
    const agree = archetype === chosen;
    paragraphs.push(
      para(
        'interpretation',
        agree
          ? `You picked “${ROLE_LABEL[chosen].en}” as the role that feels familiar. Your Ketu in ${f.ketu.sign} points to the same one. That is a match between your own sense and the chart, which is pleasant, though it is not proof of anything.`
          : `You picked “${ROLE_LABEL[chosen].en}” as the role that feels familiar; your Ketu in ${f.ketu.sign} points to “${ROLE_LABEL[archetype].en}”. These do not agree, and that is fine: your pick is a feeling, the chart is a calculation, and the gap itself is worth thinking about.`,
        [`ketu.sign`, `ketu.sign.lord=${SIGN_LORD[f.ketu.sign]}`, `answer.self_role=${chosen}`],
      ),
    );
  }
  const facts = [...byPrefix(f.keys, 'reference', 'ketu'), ...(ctx.profile.selfRole ? [{ key: 'answer.self_role', text: `The reader picked “${ROLE_LABEL[ctx.profile.selfRole].en}” as a role that feels familiar.` }] : [])];
  return {
    section: { ...head(ctx, 'ketu'), paragraphs },
    narrative: {
      id: 'ketu',
      title: titleFor('ketu', ctx.profile),
      facts,
      reading: [KETU_SIGN[f.ketu.sign], `Placed in your ${ordinal(f.ketu.house)} house, ${KETU_HOUSE[f.ketu.house]}`],
      fallback: [KETU_SIGN[f.ketu.sign], `Placed in your ${ordinal(f.ketu.house)} house, ${KETU_HOUSE[f.ketu.house]}`],
      ask: 'Go deeper than the preview reading: explain how Ketu, the ruler of its sign and its nakshatra work together in this chart, then say how that might show up for this reader, then give one practical step.',
      kinds: ['interpretation', 'hypothesis', 'advice'],
      allow: '',
    },
  };
}

function rahu(ctx: BuildCtx): SectionBuild {
  const f = ctx.facts;
  const paragraphs = nodeFactParas(f.rahu, 'rahu');
  return {
    section: { ...head(ctx, 'rahu'), paragraphs },
    narrative: {
      id: 'rahu',
      title: titleFor('rahu', ctx.profile),
      facts: byPrefix(f.keys, 'reference', 'rahu'),
      reading: [RAHU_SIGN[f.rahu.sign], `Placed in your ${ordinal(f.rahu.house)} house, ${RAHU_HOUSE[f.rahu.house]}`],
      fallback: [RAHU_SIGN[f.rahu.sign], `Placed in your ${ordinal(f.rahu.house)} house, ${RAHU_HOUSE[f.rahu.house]}`],
      ask: 'Go deeper than the preview reading: explain how Rahu, the ruler of its sign and its nakshatra work together, then say how its pull might show up for this reader (use their goal if they gave one), then give one practical step toward it.',
      kinds: ['interpretation', 'hypothesis', 'advice'],
      allow: '',
    },
  };
}

function axis(ctx: BuildCtx): SectionBuild {
  const f = ctx.facts;
  const paragraphs = [
    para('fact', `Rahu is in your ${ordinal(f.rahu.house)} house and Ketu in your ${ordinal(f.ketu.house)}. Rahu and Ketu are always exactly opposite, so the pair always marks one axis across the chart.`, ['axis']),
    para('interpretation', AXIS_THEME[f.rahu.house], ['axis', 'rahu.house', 'ketu.house']),
  ];
  return {
    section: { ...head(ctx, 'axis'), paragraphs },
    narrative: {
      id: 'axis',
      title: titleFor('axis', ctx.profile),
      facts: byPrefix(f.keys, 'reference', 'axis', 'ketu.sign', 'ketu.house', 'rahu.sign', 'rahu.house', 'ketu.dispositor', 'rahu.dispositor'),
      reading: [AXIS_THEME[f.rahu.house]],
      fallback: [],
      ask: 'Describe the axis as one life theme and how it might read in this reader’s everyday choices. If the reader answered the question that brought them here, speak to it. Give one practice that balances the two ends.',
      kinds: ['hypothesis', 'advice'],
      allow: '',
    },
  };
}

// ── 5th and 9th ────────────────────────────────────────────────────────────

function fifthNinth(ctx: BuildCtx): SectionBuild {
  const f = ctx.facts;
  const h5 = f.fifth;
  const h9 = f.ninth;
  const fh = (h: BlueprintFacts['ninth'], tag: string) => {
    const where = `${h.lord}, the lord of your ${ordinal(h.house)} house (${h.sign}), sits in ${h.lordSign} in your ${ordinal(h.lordHouse)} house, ${DIGNITY_PHRASE[h.lordDignity]}.`;
    const occ = h.occupants.length ? `${list(h.occupants)} ${h.occupants.length === 1 ? 'is' : 'are'} in the house itself.` : 'No planet sits in the house itself.';
    const asp = h.aspectedBy.length ? `${list(h.aspectedBy)} ${h.aspectedBy.length === 1 ? 'aspects' : 'aspect'} it.` : 'No planet aspects it.';
    return para('fact', `${where} ${occ} ${asp}`, [`${tag}.sign`, `${tag}.lord`, `${tag}.occupants`, `${tag}.aspects`]);
  };
  const paragraphs = [
    fh(h5, 'h5'),
    para('interpretation', MERIT_TEXT[h5.level], ['h5.merit', 'h5.lord']),
    fh(h9, 'h9'),
    para('interpretation', `The 9th house is read as dharma: what you hold to be right, who you learn from, and the luck that seems to arrive through teachers and good advice. Traditionally a 9th lord in the ${ordinal(h9.lordHouse)} house points that energy toward ${HOUSE_THEME[h9.lordHouse]}.`, ['h9.lord']),
  ];
  return {
    section: { ...head(ctx, 'fifth_ninth'), paragraphs },
    narrative: {
      id: 'fifth_ninth',
      title: titleFor('fifth_ninth', ctx.profile),
      facts: byPrefix(f.keys, 'reference', 'h5', 'h9'),
      reading: [MERIT_TEXT[h5.level]],
      fallback: [],
      ask: 'Say what the 5th and 9th houses together suggest this reader can draw on (learning, creativity, advisers, luck through effort). Speak only of learning, creative work, advisers and merit. Say nothing about children or pregnancy.',
      kinds: ['interpretation', 'hypothesis', 'advice'],
      allow: '',
    },
  };
}

// ── dasha ──────────────────────────────────────────────────────────────────

function dasha(ctx: BuildCtx): SectionBuild {
  const f = ctx.facts;
  const d = f.dasha;
  if (!d) {
    return {
      section: {
        ...head(ctx, 'dasha'),
        paragraphs: [para('limit', 'The period calendar for this date could not be read from the chart, so this section is left short. Your major and sub-periods are shown in the snapshot table when available.', ['dasha.maha'])],
      },
      narrative: null,
    };
  }
  const paragraphs: BlueprintParagraph[] = [];
  paragraphs.push(
    para(
      'fact',
      `You are in the ${d.maha.planet} major period (${d.maha.start} to ${d.maha.end})${d.antar ? `, within it the ${d.antar.planet} sub-period (${d.antar.start} to ${d.antar.end})` : ''}.`,
      ['dasha.maha', ...(d.antar ? ['dasha.antar'] : [])],
    ),
  );
  if (d.nextChange) {
    const major = !d.antar || d.antar.end >= d.maha.end;
    const next = d.nextAntar;
    paragraphs.push(
      para(
        'fact',
        `The next change is on ${longDate(d.nextChange)}${next ? `, when the ${next.planet} ${major ? 'major period' : 'sub-period'} follows` : ''}.${ctx.sensitivity.confidence === 'approx' && ctx.sensitivity.mahaPlanets.length === 1 && ctx.sensitivity.nextChangeShiftDays ? ` Because your birth time is approximate, treat that date as accurate to within about ${ctx.sensitivity.nextChangeShiftDays} days.` : ctx.sensitivity.confidence !== 'exact' && ctx.sensitivity.mahaPlanets.length > 1 ? ` Because your birth time is ${ctx.sensitivity.confidence === 'unknown' ? 'not known' : 'approximate'}, even the planet of this major period is provisional (see your chart snapshot).` : ctx.sensitivity.confidence === 'unknown' ? ' Because your birth time is not known, treat that date as provisional.' : ''}`,
        ['dasha.next', ...(ctx.sensitivity.confidence !== 'exact' ? ['time.dasha'] : [])],
      ),
    );
  }
  const noteM = DASHA_LORD_NOTE[d.maha.planet];
  if (noteM) paragraphs.push(para('interpretation', `Traditionally a ${d.maha.planet} major period is about ${noteM}. In your chart ${d.maha.planet} sits in your ${ordinal(d.mahaLord?.house ?? 1)} house${d.mahaLord?.rules.length ? ` and rules your ${list(d.mahaLord.rules.map(ordinal))} ${d.mahaLord.rules.length === 1 ? 'house' : 'houses'}` : ''}, which is where that theme is colored for you.`, ['dasha.maha', 'dasha.maha.lord']));
  const noteA = d.antar ? DASHA_LORD_NOTE[d.antar.planet] : null;
  if (d.antar && noteA) paragraphs.push(para('interpretation', `The ${d.antar.planet} sub-period inside it is about ${noteA}; it sets the tone of the current few years.`, ['dasha.antar', 'dasha.antar.lord']));
  if (ctx.eventDasha && ctx.profile.eventText) {
    paragraphs.push(
      para('fact', `The date you told us about falls in the ${ctx.eventDasha.antar ?? ctx.eventDasha.maha} ${ctx.eventDasha.antar ? 'sub-period' : 'major period'} of the ${ctx.eventDasha.maha} major period.`, ['event.dasha']),
    );
  }
  const eventFact: Fact[] = ctx.eventDasha ? [{ key: 'event.dasha', text: `The reader’s date falls in the ${ctx.eventDasha.antar ?? ctx.eventDasha.maha} ${ctx.eventDasha.antar ? 'sub-period' : 'major period'} of the ${ctx.eventDasha.maha} major period.` }] : [];
  return {
    section: { ...head(ctx, 'dasha'), paragraphs },
    narrative: {
      id: 'dasha',
      title: titleFor('dasha', ctx.profile),
      facts: [...byPrefix(f.keys, 'reference', 'dasha', 'time'), ...eventFact],
      reading: [noteM ? `A ${d.maha.planet} major period is traditionally about ${noteM}.` : '', noteA ? `A ${d.antar!.planet} sub-period is traditionally about ${noteA}.` : ''].filter(Boolean),
      fallback: [],
      ask: 'Describe the chapter the reader is in: what the major period and the sub-period together emphasise for them, why it may feel the way they described, and what changes on the next change date. Give one practical way to use the rest of this sub-period.',
      kinds: ['interpretation', 'hypothesis', 'advice'],
      allow: `${d.nextChange ?? ''}`,
    },
  };
}

// ── karmic-debt house ──────────────────────────────────────────────────────

function debt(ctx: BuildCtx): SectionBuild {
  const f = ctx.facts;
  const h = f.ketu.house;
  const paragraphs: BlueprintParagraph[] = [
    para(
      'interpretation',
      `In this report the house Ketu sits in is called your karmic-debt house. That is our naming, not a classical term: Ketu marks what you have already lived through and carry in, and its house shows the part of life where that unfinished business tends to show up. Yours is the ${ordinal(h)} house, which reads ${HOUSE_THEME[h]}.`,
      ['ketu.house'],
    ),
    para('advice', 'Three practices, all free and ordinary. They are ordinary good habits for that part of life, and they are suggested because of where Ketu sits, not as a cure:', ['ketu.house']),
    ...DEBT_PRACTICES[h].map((t, i) => para('advice', `${i + 1}. ${t}`, ['ketu.house'])),
  ];
  const sit = ctx.profile.detail ? SITUATIONS[ctx.profile.detail] : null;
  return {
    section: { ...head(ctx, 'debt'), paragraphs },
    narrative: {
      id: 'debt',
      title: titleFor('debt', ctx.profile),
      facts: [...byPrefix(f.keys, 'reference', 'ketu.sign', 'ketu.house', 'ketu.dispositor'), { key: 'debt.theme', text: `The ${ordinal(h)} house reads ${HOUSE_THEME[h]}.` }],
      reading: DEBT_PRACTICES[h],
      fallback: [],
      ask: `Help the reader start. Pick the one practice above that fits them best and say why, give a first step they can do this week${sit ? ` (their situation: ${sit.clause})` : ''}, and say what to notice after a month. Do not add other practices.`,
      kinds: ['advice', 'hypothesis'],
      allow: '',
    },
  };
}

// ── windows ────────────────────────────────────────────────────────────────

const windowKey = (w: NodalWindow) => `window.${w.id}`;

function windows(ctx: BuildCtx): SectionBuild {
  const f = ctx.facts;
  const ws = ctx.windows;
  const paragraphs: BlueprintParagraph[] = [
    para(
      'fact',
      ws.length
        ? `Rahu and Ketu move backwards through the zodiac, about a sign every eighteen months. In the twelve months from ${longDate(ctx.today)} they do three things that matter here: change sign, pass over your own planets, and bring the Sun within range of the axis (eclipse season). Each window below is calculated from the ephemeris.`
        : `In the twelve months from ${longDate(ctx.today)} the Rahu–Ketu axis does not change sign or pass within 2° of any of your natal planets, and no eclipse season falls in the period. That is a calm year on this measure.`,
      ['axis'],
    ),
    ...ws.map((w) => para('fact', `${w.title}. ${w.fact}${w.onFocusHouse && ctx.plan.area ? ` This touches a house that reads ${AREA_NAME[ctx.plan.area]}.` : ''}`, w.source_keys.concat(windowKey(w)))),
  ];
  const table: BlueprintTable | undefined = ws.length
    ? {
        caption: 'Sensitive windows, in date order',
        head: ['Dates', 'What', 'Axis across', 'Touches your focus'],
        rows: ws.map((w) => [
          `${shortDate(w.start)} – ${shortDate(w.end)}`,
          w.title,
          `${ordinal(w.rahuHouse)} / ${ordinal(w.ketuHouse)}`,
          w.onFocusHouse ? 'Yes' : '–',
        ]),
      }
    : undefined;
  const winFacts: Fact[] = ws.map((w) => ({ key: windowKey(w), text: `${w.title}: ${w.start} to ${w.end}. ${w.fact}` }));
  return {
    section: { ...head(ctx, 'windows'), paragraphs, table, windows: ws },
    narrative: {
      id: 'windows',
      title: titleFor('windows', ctx.profile),
      facts: [...keyed(f.keys, ['reference', 'axis']), ...winFacts],
      reading: ['A sensitive window is a stretch in which the themes of two houses are easier to notice. It is a reason to plan with more care and more patience, not a reason for alarm.'],
      fallback: ['A sensitive window is a stretch in which the themes of two houses are easier to notice. It is a reason to plan with more care and more patience, not a reason for alarm.'],
      ask: `Explain how to use these windows. Say which window matters most for this reader and why${ctx.plan.eventDate ? `, and which windows sit near ${ctx.plan.eventDate}` : ''}. Give one rule of thumb for planning around a window (what to do before, during, after).`,
      kinds: ['interpretation', 'advice'],
      allow: ws.map((w) => `${w.start} ${w.end} ${w.peak ?? ''}`).join(' '),
    },
  };
}

// ── focus chapter ───────────────────────────────────────────────────────────

function focus(ctx: BuildCtx): SectionBuild {
  const f = ctx.facts;
  const area = ctx.plan.area as Exclude<Area, 'curious'>;
  const hs = ctx.plan.focusHouses.slice(0, 3);
  const af = areaFacts(f, hs);
  const paragraphs: BlueprintParagraph[] = hs.map((n) => {
    const h = f.houses[n - 1];
    const occ = h.occupants.length ? `The ${ordinal(n)} house itself holds ${list(h.occupants)}.` : `The ${ordinal(n)} house itself is empty.`;
    return para(
      'fact',
      `Your ${ordinal(n)} house (${HOUSE_THEME[n]}) is ${h.sign}, ruled by ${h.lord}. ${h.lord} sits in ${h.lordSign} in your ${ordinal(h.lordHouse)} house, ${DIGNITY_PHRASE[h.lordDignity]}. ${occ}`,
      [`area.h${n}.sign`, `area.h${n}.lord`, `area.h${n}.occupants`],
    );
  });
  const kar = AREA_KARAKAS[area].map((g) => planetLine(f, g));
  paragraphs.push(para('fact', `The planets traditionally linked with this area are ${AREA_KARAKAS[area].join(' and ')}. ${kar.map((k) => k.text).join(' ')}`, kar.map((k) => k.key)));
  const nodeOnArea = [f.ketu.house, f.rahu.house].filter((n) => hs.includes(n));
  if (nodeOnArea.length) {
    paragraphs.push(
      para('interpretation', `Your Rahu–Ketu axis runs through ${nodeOnArea.length === 2 ? 'two of these houses' : `your ${ordinal(nodeOnArea[0])} house`}, so this area is part of your karmic theme and not just a passing concern.`, ['axis']),
    );
  }
  const sit = ctx.profile.detail ? SITUATIONS[ctx.profile.detail] : null;
  return {
    section: { ...head(ctx, 'focus'), paragraphs },
    narrative: {
      id: 'focus',
      title: titleFor('focus', ctx.profile),
      facts: [...keyed(f.keys, ['reference', 'axis', 'ketu.house', 'rahu.house']), ...af, ...kar],
      reading: [`Traditionally ${hs.map((n) => `the ${ordinal(n)} house reads ${HOUSE_THEME[n]}`).join('; ')}.`],
      fallback: [],
      ask: `Write the reader’s focus chapter on ${AREA_NAME[area]}: what the chart says about how they work in this area, where the Rahu–Ketu axis touches it, and where the strain or the strength is.${sit ? ` Their situation: ${sit.clause}. ${sit.angle}` : ''}`,
      kinds: ['interpretation', 'hypothesis', 'advice', 'advice'],
      allow: '',
    },
  };
}

// ── event ──────────────────────────────────────────────────────────────────

function event(ctx: BuildCtx): SectionBuild {
  const p = ctx.profile;
  const date = ctx.plan.eventDate;
  const paragraphs: BlueprintParagraph[] = [];
  let table: BlueprintTable | undefined;
  const near: NodalWindow[] = date ? ctx.allWindows.filter((w) => w.end >= addDays(date, -21) && w.start <= addDays(date, 21)) : [];
  const eventFacts: Fact[] = [];

  if (date) {
    const gone = daysBetween(ctx.today, date);
    eventFacts.push({ key: 'event.date', text: `The reader’s date is ${date}.` });
    paragraphs.push(para('fact', `You told us “${p.eventText}”, which we read as ${longDate(date)} (${gone >= 0 ? `${gone} days from today` : `${-gone} days ago`}). If that is not the date you meant, the windows above still apply to the calendar; only the day-by-day table is centred on the wrong day.`, ['event.date']));
    if (ctx.eventDasha) {
      paragraphs.push(para('fact', `On that date you are in the ${ctx.eventDasha.antar ?? ctx.eventDasha.maha} ${ctx.eventDasha.antar ? 'sub-period' : 'major period'} of the ${ctx.eventDasha.maha} major period.`, ['event.dasha']));
    }
    if (near.length) {
      for (const w of near) {
        eventFacts.push({ key: windowKey(w), text: `${w.title}: ${w.start} to ${w.end}. ${w.fact}` });
        paragraphs.push(para('fact', `${w.title}: ${w.start} to ${w.end}. This overlaps the three weeks either side of your date.`, w.source_keys.concat(windowKey(w))));
      }
    } else {
      paragraphs.push(para('fact', 'No Rahu–Ketu sensitive window falls within three weeks either side of that date, so on this measure the date sits in a quiet stretch.', ['axis']));
    }
    if (ctx.eventGrid && ctx.eventGrid.length) {
      const rows = dayRows(ctx.eventGrid, ctx.allWindows);
      table = dayTable(rows, `The days around ${longDate(date)}`);
      paragraphs.push(...dayFacts(rows, 'event'));
      const day = rows.find((r) => r.date === date);
      if (day) {
        eventFacts.push({ key: 'event.day', text: `On ${date} the engine scores the day ${day.score} (${day.word}); the strongest hours are ${day.hours.join(', ')} and Rahu Kaal is ${day.rahuKaal}.` });
        paragraphs.push(para('fact', `On the day itself the engine scores it ${day.score} (${day.word}). The strongest hours are ${day.hours.join(', ') || 'none clear of Rahu Kaal'}, and Rahu Kaal, the stretch traditionally kept for routine rather than new beginnings, runs ${day.rahuKaal}.`, ['event.day']));
      }
    }
  } else {
    paragraphs.push(para('fact', `You told us “${p.eventText}” but not an exact date, so we cannot centre a window on it. Instead, here is how the next twelve months look, month by month, so you can choose a date with the calendar in front of you.`, ['event.undated']));
    const months = quietMonths(ctx.today, ctx.allWindows);
    eventFacts.push({ key: 'event.undated', text: `Months with no window: ${months.quiet.join(', ') || 'none'}. Months with a window: ${months.busy.join(', ') || 'none'}.` });
    paragraphs.push(para('fact', `Quieter months (no sensitive window): ${months.quiet.join(', ') || 'none'}. Months with at least one window: ${months.busy.join(', ') || 'none'}.`, ['event.undated']));
  }
  const sit = p.detail ? SITUATIONS[p.detail] : null;
  return {
    section: { ...head(ctx, 'event'), paragraphs, table },
    narrative: {
      id: 'event',
      title: titleFor('event', p),
      facts: [...keyed(ctx.facts.keys, ['reference', 'axis']), ...byPrefix(ctx.facts.keys, 'dasha'), ...eventFacts],
      reading: ['A chart can break a tie between two otherwise equal dates. It is not a reason to do, or not to do, something that otherwise makes sense.'],
      fallback: ['A chart can break a tie between two otherwise equal dates. It is not a reason to do, or not to do, something that otherwise makes sense.'],
      ask: `Help the reader think about their date: “${modelSafe(p.eventText)}”. Say what the calculated facts suggest about preparing for it, which days around it are better for conversations versus signing, and what to check in real life first.${sit ? ` ${sit.angle} Real-life checks: ${sit.checks.join('; ')}.` : ''}`,
      kinds: ['hypothesis', 'advice', 'advice'],
      allow: [date ?? '', ...near.map((w) => `${w.start} ${w.end} ${w.peak ?? ''}`)].join(' '),
    },
  };
}

const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function quietMonths(today: string, all: NodalWindow[]): { quiet: string[]; busy: string[] } {
  const quiet: string[] = [];
  const busy: string[] = [];
  const [y0, m0] = today.split('-').map(Number);
  for (let i = 0; i < 12; i++) {
    const idx = (m0 - 1 + i) % 12;
    const y = y0 + Math.floor((m0 - 1 + i) / 12);
    const first = `${y}-${String(idx + 1).padStart(2, '0')}-01`;
    const last = `${y}-${String(idx + 1).padStart(2, '0')}-31`;
    const hit = all.some((w) => w.end >= first && w.start <= last);
    (hit ? busy : quiet).push(`${MONTHS_FULL[idx]} ${y}`);
  }
  return { quiet, busy };
}

// ── partner ────────────────────────────────────────────────────────────────

function partner(ctx: BuildCtx): SectionBuild {
  const f = ctx.facts;
  const p = ctx.profile;
  const h7 = f.houses[6];
  const venus = planetLine(f, 'Venus');
  const paragraphs: BlueprintParagraph[] = [
    para('fact', `Your 7th house (partnership) is ${h7.sign}, ruled by ${h7.lord}, which sits in ${h7.lordSign} in your ${ordinal(h7.lordHouse)} house, ${DIGNITY_PHRASE[h7.lordDignity]}. ${h7.occupants.length ? `${list(h7.occupants)} ${h7.occupants.length === 1 ? 'is' : 'are'} in the 7th itself.` : 'No planet sits in the 7th itself.'}`, ['area.h7.sign', 'area.h7.lord', 'area.h7.occupants']),
    para('fact', `Venus, the planet of close bonds: ${venus.text}`, [venus.key]),
    para('limit', `This chapter reads your side of the bond with ${p.partnerName}: how you tend to commit, argue and make up. There is no chart for ${p.partnerName} here, so nothing below describes their character, their feelings or what they will do.`, ['answer.partner']),
  ];
  return {
    section: { ...head(ctx, 'partner'), paragraphs },
    narrative: {
      id: 'partner',
      title: titleFor('partner', p),
      facts: [...keyed(f.keys, ['reference', 'axis']), ...areaFacts(f, [7]), venus, { key: 'answer.partner', text: `The reader named a person, ${p.partnerName}.` }],
      reading: ['Traditionally the 7th house, its lord and Venus describe how a person approaches partnership.'],
      fallback: ['Traditionally the 7th house, its lord and Venus describe how a person approaches partnership.'],
      ask: `Write about how the reader approaches this bond with ${p.partnerName}, from the reader’s own chart only. Say what the 7th house, its lord and Venus suggest about how they commit, communicate and handle disagreement, and give one practical step for the conversation they may need. Do not describe ${p.partnerName}.`,
      kinds: ['interpretation', 'hypothesis', 'advice'],
      allow: p.partnerName ?? '',
    },
  };
}

// ── thirty ─────────────────────────────────────────────────────────────────

function thirty(ctx: BuildCtx): SectionBuild {
  const grid = ctx.thirtyGrid ?? [];
  if (!grid.length) {
    return {
      section: { ...head(ctx, 'thirty'), paragraphs: [para('limit', 'The daily grid for the next 30 days could not be read when this report was made, so this section is left empty. Your 30-day forecast is available from your dashboard.', ['thirty.unavailable'])] },
      narrative: null,
    };
  }
  const rows = dayRows(grid, ctx.allWindows);
  return {
    section: {
      ...head(ctx, 'thirty'),
      paragraphs: [
        para('fact', `These are your next ${rows.length} days from ${longDate(rows[0].date)}, scored by the same engine that scores the daily forecast for your birth chart. “Feel” is the whole-day score; “Best hours” are the three strongest separate hours that fall outside Rahu Kaal.`, ['thirty.scores']),
        ...dayFacts(rows, 'thirty'),
      ],
      table: dayTable(rows, 'Your next 30 days'),
    },
    narrative: null,
  };
}

// ── limits ─────────────────────────────────────────────────────────────────

function limits(ctx: BuildCtx): SectionBuild {
  const p = ctx.profile;
  const paras: BlueprintParagraph[] = LIMITS_FIXED.map((t) => para('limit', t, ['limits.standard']));
  if (ctx.facts.timeConfidence !== 'exact') {
    paras.unshift(para('limit', `Your birth time is ${ctx.facts.timeConfidence === 'approx' ? 'approximate' : 'not known'}. ${ctx.facts.timeConfidence === 'approx' ? 'Everything that depends on the rising sign or the exact Moon degree is marked above and should be read as provisional.' : 'Everything here is counted from your Moon sign. If you can find the time on a birth certificate or hospital record, ask for the report again with it.'}`, ['time.' + (ctx.facts.timeConfidence === 'approx' ? 'rising' : 'unknown')]));
  }
  if (p.concern === 'children' || p.concern === 'health') {
    paras.push(para('limit', p.concern === 'children' ? 'You told us family matters are on your mind. This report does not speak to family-planning outcomes or to any medical matter; for those, please speak with a doctor.' : 'You told us about health and energy. This report speaks only about routine and timing; it makes no statement about any medical matter. Please follow your own doctor’s advice.', ['answer.concern']));
  }
  if (p.partnerName) paras.push(para('limit', `Nothing in this report describes ${p.partnerName}. Two people’s charts can only be compared with both charts in hand.`, ['answer.partner']));
  return { section: { ...head(ctx, 'limits'), paragraphs: paras }, narrative: null };
}

// ── registry ───────────────────────────────────────────────────────────────

const BUILDERS: Record<Exclude<SectionId, 'brief'>, (c: BuildCtx) => SectionBuild> = {
  snapshot,
  ketu,
  rahu,
  axis,
  fifth_ninth: fifthNinth,
  dasha,
  debt,
  windows,
  focus,
  event,
  partner,
  thirty,
  limits,
};

export function buildSection(id: SectionId, ctx: BuildCtx): SectionBuild | null {
  if (id === 'brief') return null;
  return BUILDERS[id](ctx);
}
