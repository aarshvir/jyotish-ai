/**
 * Karmic Blueprint, step 3: what the reader told us decides what they get.
 *
 * Pure and deterministic. From a SeekerProfile (the quiz answers) this produces:
 *   - which sections are in the report, and in what order
 *   - the opening brief, quoting their own selections back to them
 *   - a "Why this is in your report" line for every section, naming the answer behind it
 *   - the writing directives handed to the narrative step
 *
 * Nothing here calls a model, so a test can assert, for one fixed chart, exactly how the
 * report changes when a single answer changes.
 */

import { LOCKED_ORDER } from '@/lib/funnel/reveal/content';
import { ordinal } from '@/lib/funnel/reveal/astro';
import {
  AREA_HOUSES,
  AREA_NAME,
  hasAnyAnswer,
  wantsCalm,
  wantsConcrete,
  wantsNoSales,
  type Area,
  type SeekerProfile,
} from '@/lib/personalization/profile';
import { SITUATIONS } from '@/lib/personalization/situations';
import { longDate, selectionsOf, TIME_LABEL } from '@/lib/personalization/selections';
import type { BlueprintBrief, NodalWindow, SectionId } from './types';
import type { BlueprintFacts } from './facts';

export type PlanKind = 'blueprint' | 'blueprint_plus30';

export const SECTION_TITLE: Record<Exclude<SectionId, 'focus' | 'partner' | 'event'>, string> = {
  brief: 'What you told us',
  snapshot: 'Your chart snapshot',
  ketu: 'Ketu: what you carry in',
  rahu: 'Rahu: what this life asks of you',
  axis: 'The Rahu–Ketu axis as your life theme',
  fifth_ninth: 'Past merit and dharma: your 5th and 9th houses',
  dasha: 'The chapter you are in now',
  debt: 'Your karmic-debt house, and what eases it',
  windows: 'Rahu–Ketu sensitive windows: the next 12 months',
  thirty: 'Your next 30 days',
  limits: 'What this report cannot tell you',
};

export function titleFor(id: SectionId, p: SeekerProfile): string {
  if (id === 'focus') return `Your focus chapter: ${AREA_NAME[p.area ?? 'curious']}`;
  if (id === 'partner') return p.partnerName ? `Your side of the bond with ${p.partnerName}` : 'Your side of the bond';
  if (id === 'event') return 'The weeks around your date';
  return SECTION_TITLE[id];
}

export interface BlueprintPlan {
  order: SectionId[];
  /** Why a section was moved up front, for sections that were. */
  moved: Partial<Record<SectionId, string>>;
  area: Area | null;
  /** Houses (from the reference sign) that read the reader's area. */
  focusHouses: number[];
  /** ISO date of the event, when one was given. */
  eventDate: string | null;
}

const BASE: SectionId[] = ['snapshot', 'ketu', 'rahu', 'axis', 'fifth_ninth', 'dasha', 'debt', 'windows'];

export interface PlanOpts {
  plan: PlanKind;
  eventDate: string | null;
}

export function planBlueprint(p: SeekerProfile, opts: PlanOpts): BlueprintPlan {
  const area = p.area && p.area !== 'curious' ? p.area : null;
  const lead: SectionId[] = [];
  const moved: Partial<Record<SectionId, string>> = {};
  const pull = (id: SectionId, why: string) => {
    if (!lead.includes(id)) lead.push(id);
    // A section can be wanted for more than one reason; say all of them.
    moved[id] = moved[id] ? `${moved[id]}, and because ${why}` : why;
  };

  if (p.hasEvent === 'yes' && p.eventText) pull('event', `you told us about “${p.eventText}”`);
  if (area) pull('focus', `you said your concern is ${AREA_NAME[area]}`);
  if (p.partnerName) pull('partner', `you named ${p.partnerName}`);
  if (area) {
    const first = (LOCKED_ORDER[area === 'business' ? 'career' : area] ?? []).find((k): k is 'dasha' | 'windows' | 'debt' => k === 'dasha' || k === 'windows' || k === 'debt');
    if (first) pull(first, `it is the section most often asked about for ${AREA_NAME[area]}`);
  }
  if (p.duration === 'years' || p.duration === 'year') pull('dasha', `you said this has been on your mind for ${p.duration === 'years' ? 'years' : 'about a year'}, which fits a long chapter more than a short passing phase`);
  if (p.granularity === 'months' || p.granularity === 'days' || p.granularity === 'all') pull('windows', `you said ${p.labels.granularity?.toLowerCase() ?? 'timing'} would change how you plan`);
  if (opts.plan === 'blueprint_plus30' && (p.granularity === 'hours' || p.granularity === 'days')) pull('thirty', `you said ${p.labels.granularity?.toLowerCase()} would change how you plan`);

  const rest = BASE.filter((id) => id !== 'snapshot' && !lead.includes(id));
  if (opts.plan === 'blueprint_plus30' && !lead.includes('thirty')) rest.push('thirty');

  return {
    order: ['brief', 'snapshot', ...lead, ...rest, 'limits'],
    moved,
    area,
    focusHouses: area ? AREA_HOUSES[area] : [],
    eventDate: opts.eventDate,
  };
}

// ── "Why this is in your report" ────────────────────────────────────────────────

export interface WhyContext {
  profile: SeekerProfile;
  facts: BlueprintFacts;
  plan: BlueprintPlan;
  windows: NodalWindow[];
  /** The sub-period running on the event date, when there is one. */
  eventDasha: { maha: string; antar: string | null } | null;
}

const quoted = (s: string | null | undefined) => (s ? `“${s}”` : '');

export function whyFor(id: SectionId, c: WhyContext): string {
  const { profile: p, facts, plan } = c;
  const area = plan.area;
  const moved = plan.moved[id];
  const lines: string[] = [];

  switch (id) {
    case 'brief':
      lines.push(hasAnyAnswer(p) ? 'Every report starts by showing what you told us, so you can check it was heard correctly.' : 'You did not answer the quiz questions, so this report follows the standard order.');
      break;
    case 'snapshot':
      lines.push('Every report rests on the same calculated chart, so it comes first.');
      if (facts.timeConfidence === 'approx') lines.push('You said your birth time is approximate, so this section also tests how far a two-hour error would move the chart.');
      else if (facts.timeConfidence === 'unknown') lines.push('You said your birth time is not known, so houses are counted from your Moon sign and this section says what that changes.');
      else lines.push('You gave an exact birth time, so houses are counted from your rising sign.');
      break;
    case 'ketu': {
      lines.push('Ketu is what you carry in, the first half of the Karmic Blueprint.');
      if (p.labels.self_role) lines.push(`You picked ${quoted(p.labels.self_role)} as the role that feels familiar; it is compared with what your Ketu points to here, as a comparison and not as proof.`);
      if (area && facts.ketu.house && plan.focusHouses.includes(facts.ketu.house)) lines.push(`Your Ketu sits in the ${ordinal(facts.ketu.house)} house, which also reads ${AREA_NAME[area]}, the area you named.`);
      else if (p.detail && SITUATIONS[p.detail]) lines.push(`You told us ${SITUATIONS[p.detail].clause}, so the reading below looks at how this shows up there.`);
      break;
    }
    case 'rahu': {
      lines.push('Rahu is what this life pulls you toward, the second half of the Karmic Blueprint.');
      if (p.labels.goal_12m) lines.push(`You said ${quoted(p.labels.goal_12m)} matters most in the next 12 months, so Rahu’s pull is read against that.`);
      else if (area && plan.focusHouses.includes(facts.rahu.house)) lines.push(`Your Rahu sits in the ${ordinal(facts.rahu.house)} house, which also reads ${AREA_NAME[area]}, the area you named.`);
      break;
    }
    case 'axis': {
      lines.push('Rahu and Ketu always sit opposite each other, so their two houses are read together as one theme.');
      if (p.duration === 'years' || p.duration === 'year') lines.push(`You said this has been on your mind for ${p.labels.duration?.toLowerCase() ?? 'a long time'}; an axis theme is the kind of long-running pattern that fits that.`);
      else if (p.labels.hook) lines.push(`You answered ${quoted(p.labels.hook)} to the question that brought you here; this is the part of the chart that speaks to it.`);
      break;
    }
    case 'fifth_ninth': {
      lines.push('Your 5th house shows the merit you bring in and your 9th shows dharma, so together they show what you have to draw on.');
      if (p.skillsFears === 'skills' || p.skillsFears === 'both') lines.push('You said some skills come unusually easily; the 5th house is where that is read.');
      else if (area === 'career' || area === 'business') lines.push('The 9th house also reads luck, mentors and advice, which matters for your question about work.');
      break;
    }
    case 'dasha': {
      lines.push('Your current life chapter (dasha) is the background to every other section.');
      if (moved) lines.push(`It is placed up front because ${moved}.`);
      if (c.eventDasha) {
        const when = p.eventText ? `Your date, ${quoted(p.eventText)},` : 'Your date';
        lines.push(`${when} falls in the ${c.eventDasha.antar ?? c.eventDasha.maha} ${c.eventDasha.antar ? 'sub-period' : 'major period'}.`);
      }
      break;
    }
    case 'debt': {
      lines.push('Ketu’s house is where unfinished business tends to show up, so the easing practices are built around it.');
      if (wantsNoSales(p)) lines.push('You said pressure to buy things has bothered you; every practice here is free and ordinary.');
      if (wantsConcrete(p)) lines.push('You said astrology has felt vague, so each practice has a day or a number attached.');
      if (p.detail && SITUATIONS[p.detail]) lines.push(`They are chosen with this in mind: ${SITUATIONS[p.detail].clause}.`);
      break;
    }
    case 'windows': {
      lines.push('Rahu and Ketu change signs and touch your natal planets on a fixed calendar, which is what “sensitive” means here.');
      if (c.plan.eventDate && p.eventText) lines.push(`You told us about ${quoted(p.eventText)} (${longDate(c.plan.eventDate)}); windows within three weeks of that date are marked.`);
      if (area) lines.push(`Windows that fall on your ${plan.focusHouses.slice(0, 3).map(ordinal).join(', ')} houses are marked, because you said ${AREA_NAME[area]}.`);
      if (p.granularity === 'hours' && c.plan.order.includes('thirty')) lines.push('You said the best hours of a day would change how you plan. The windows here are weeks and months; your best hours for the next 30 days are in their own section.');
      else if (p.granularity === 'hours' && !wantsNoSales(p)) lines.push('You said the best hours of a day would change how you plan. This report works at the level of weeks and months; hours need the daily forecast.');
      else if (moved) lines.push(`It is placed up front because ${moved}.`);
      break;
    }
    case 'focus': {
      const label = p.labels.focus_area ?? p.labels.concern;
      lines.push(`You said ${quoted(label)}, so this chapter reads ${AREA_NAME[area ?? 'curious']} through your ${plan.focusHouses.slice(0, 3).map(ordinal).join(', ')} houses.`);
      if (p.detail && SITUATIONS[p.detail]) lines.push(`You also told us ${SITUATIONS[p.detail].clause}, so the advice is aimed there.`);
      break;
    }
    case 'event':
      lines.push(`You told us ${quoted(p.eventText)}${plan.eventDate ? ` (${longDate(plan.eventDate)})` : ''}.`);
      if (!plan.eventDate) lines.push('You gave no exact date, so this section shows how the coming year looks around any date you choose.');
      break;
    case 'partner': {
      lines.push(`You named ${p.partnerName}, so this chapter reads your side of that bond: your 7th house and Venus.`);
      if (p.partnerKnown === 'none') lines.push('You do not have their birth details, so nothing here describes them.');
      else if (p.partnerKnown === 'full' || p.partnerKnown === 'date') lines.push('You have their birth details; a side-by-side reading needs their full chart, which this report does not do.');
      break;
    }
    case 'thirty':
      lines.push('You added the next 30 days to your order.');
      if (moved) lines.push(`It is placed up front because ${moved}.`);
      break;
    case 'limits':
      lines.push('Every report ends with this section.');
      if (wantsCalm(p)) lines.push('You said astrology has made you anxious, so it says plainly what a sensitive window is not.');
      if (facts.timeConfidence !== 'exact') lines.push(`Your birth time is ${TIME_LABEL[facts.timeConfidence]}, which limits what can be said with confidence.`);
      break;
  }
  return lines.join(' ');
}

// ── The opening brief ───────────────────────────────────────────────────────────

export function buildBrief(p: SeekerProfile, plan: BlueprintPlan, facts: BlueprintFacts, name: string): BlueprintBrief {
  const first = (name || '').trim().split(/\s+/)[0];
  const arrangement: string[] = [];
  const titleOf = (id: SectionId) => titleFor(id, p);

  for (const id of plan.order) {
    const why = plan.moved[id];
    if (why) arrangement.push(`“${titleOf(id)}” comes early because ${why}.`);
  }
  if (wantsConcrete(p)) arrangement.push('You said astrology has been too vague. Every section ends with something you can do, with a day or a number attached.');
  if (wantsCalm(p)) arrangement.push('You said astrology has made you anxious. Nothing here is a warning: a sensitive window means plan with more care and patience.');
  if (wantsNoSales(p)) arrangement.push('You said pressure to buy has bothered you. Nothing here asks you to buy anything, and the practices are free.');
  if (p.prior === 'never') arrangement.push('You have not consulted an astrologer before, so each term is explained the first time it appears.');
  else if (p.prior === 'often') arrangement.push('You have consulted astrologers regularly, so the basics are skipped and the chart facts are stated directly.');
  if (p.duration === 'years') arrangement.push('You said this has been on your mind for years, so the long chapters of your chart come before the short passing windows.');
  if (facts.timeConfidence === 'approx') arrangement.push('Your birth time is approximate. The snapshot shows how far a two-hour error would move your chart, and statements that depend on it are marked.');
  if (facts.timeConfidence === 'unknown') arrangement.push('Your birth time is not known, so houses are counted from your Moon sign and anything that needs the rising sign is left out.');
  if (plan.eventDate) arrangement.push(`The weeks around ${longDate(plan.eventDate)} get their own section.`);
  if (!hasAnyAnswer(p)) arrangement.push('You did not answer the quiz questions, so this report follows the standard order.');

  return {
    heading: first ? `${first}, here is what you told us` : 'What you told us',
    selections: selectionsOf(p, plan.eventDate).map((s) => ({ topic: s.topic, value: s.value })),
    arrangement,
  };
}

// ── Directives for the narrative step ───────────────────────────────────────────

/**
 * Plain instructions, one per thing the reader said. Handed to the model verbatim, so every
 * line is specific enough to check in the output.
 */
export function writingDirectives(p: SeekerProfile, facts: BlueprintFacts, plan: BlueprintPlan): string[] {
  const d: string[] = [];

  if (p.prior === 'never') d.push('The reader has never consulted an astrologer. Explain each astrology term in the same sentence the first time it appears.');
  else if (p.prior === 'often') d.push('The reader has consulted astrologers often. Skip explanations of what a house, nakshatra or dasha is.');
  else if (p.prior) d.push('The reader has some experience of astrology. Explain a term only if it is unusual.');

  if (wantsConcrete(p)) {
    d.push('The reader found astrology too vague. Every "advice" paragraph must contain one concrete action with a day, a number of days or a count, such as "for 21 days" or "on Sunday evening".');
    d.push('Name the exact house, planet or date behind each statement. Never write a sentence that could apply to anyone.');
  }
  if (wantsCalm(p)) d.push('The reader found astrology made them anxious. Use calm wording. Never use the words avoid, warning, bad, harmful or risky. Describe a hard stretch as a time to plan with more patience.');
  if (wantsNoSales(p)) d.push('The reader dislikes pressure to buy. Mention no gemstone, ritual, puja, charm, paid service or product. Every practice must be free and ordinary.');
  if (p.frustrations.includes('generic')) d.push('The reader was bothered by getting the same answer as everyone else. Tie each paragraph to a placement that is specific to this chart.');

  if (p.duration === 'years') d.push('This has been on the reader’s mind for years. Say so once, plainly, and connect it to the long chapters of the chart rather than short transits.');
  else if (p.duration === 'year') d.push('This has been on the reader’s mind for about a year. Say so once, and connect it to the current major period.');
  else if (p.duration === 'weeks') d.push('This is recent for the reader. Focus on the current sub-period and the next three months.');

  if (p.detail && SITUATIONS[p.detail]) {
    const s = SITUATIONS[p.detail];
    d.push(`The reader told us ${s.clause}. Angle for advice: ${s.angle}`);
  }
  if (plan.area) d.push(`The reader's main area is ${AREA_NAME[plan.area]}. Where a paragraph can touch it honestly, connect it to the ${plan.focusHouses.slice(0, 3).map(ordinal).join(', ')} houses.`);
  if (p.labels.goal_12m) d.push(`The reader said the thing that matters most in the next 12 months is ${p.labels.goal_12m.toLowerCase()}. Tie Rahu's pull and the sensitive windows to that.`);

  if (p.partnerName) d.push(`The reader named a person, ${p.partnerName}. Use the name where relevant. Describe only the reader's side of the bond; there is no chart for ${p.partnerName}, so say nothing about their character or their feelings.`);
  if (p.hasEvent === 'yes' && p.eventText) d.push(`The reader has this coming up: "${p.eventText}"${plan.eventDate ? ` on ${plan.eventDate}` : ''}. Refer to it in their words once where it fits. Treat any chart timing as a tie-breaker, never a reason to act or not act.`);

  if (p.granularity === 'months') d.push('The reader plans in months. State timing at the level of weeks and months.');
  else if (p.granularity === 'days') d.push('The reader plans in days. Give specific dates wherever the facts supply them.');
  else if (p.granularity === 'hours') d.push('The reader plans by the hour. Be as specific as the facts allow, and say plainly that this report works at the level of weeks.');

  if (facts.timeConfidence === 'approx') d.push('The birth time is approximate. In sections that depend on houses, say once that the reading holds if the time is right, and give the sensitivity facts.');
  if (facts.timeConfidence === 'unknown') d.push('The birth time is unknown, so houses are counted from the Moon. Say so once per house-based section, make no claim that needs the rising sign, and call every dasha date provisional when you give one.');

  if (p.labels.self_role) d.push(`The reader picked ${p.labels.self_role} as a role that feels familiar. Compare it with what Ketu points to, honestly and once, in the Ketu section only. It is the reader's own pick, never evidence about the chart.`);
  if (p.labels.hook && p.labels.hook_question) d.push(`The reader was asked "${p.labels.hook_question}" and answered "${p.labels.hook}". Speak to that question in the Rahu–Ketu axis section.`);

  d.push(`Today's date is ${facts.today}. Never suggest an action that would have had to start before today, and say "already under way" for a window that began earlier.`);
  d.push('Quote the reader\'s own selection back at most once per section, in plain words ("you said …"), and only where it helps.');
  d.push("Each section's advice must be different from every other section's. Never repeat the same step, checklist or phrase in two sections, and never write the same opening twice.");
  return d;
}
