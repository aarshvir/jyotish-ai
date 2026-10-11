/**
 * The personal layer of the paid forecast page: an opening brief that quotes the reader's own
 * selections, the order of the forecast sections, a "why this is in your report" line for each,
 * and the window around the date they told us about.
 *
 * Pure and deterministic, computed in the browser from two things the page already has: the
 * quiz note on the report row (`reports.personal_context`) and the finished report's own days and
 * months. No model, no extra request, nothing to go stale.
 *
 * Claims about HOW the text was written ("each day names a window") are only made when the report
 * carries the stamp the generator leaves in `report_data.personalization`, so an older report is
 * never described as something it is not.
 */

import { dayWord } from '@/lib/blueprint/days';
import { addDays, daysBetween, parseEventDate } from './eventDate';
import { parseSeekerProfile } from './parse';
import { AREA_NAME, hasAnyAnswer, wantsCalm, wantsConcrete, wantsNoSales, type SeekerProfile } from './profile';
import { longDate, selectionsOf, TIME_LABEL } from './selections';
import { SITUATIONS } from './situations';

export type ForecastKey = 'answer' | 'snapshot' | 'today' | 'decide' | 'monthly' | 'weekly' | 'daily' | 'correlations' | 'synthesis' | 'chart';

/** What the generator records about how it wrote this report (report_data.personalization). */
export interface PersonalizationStamp {
  v: 1;
  concrete: boolean;
  calm: boolean;
  noSales: boolean;
  eventDate: string | null;
}

export function personalizationStamp(raw: unknown, today: string): PersonalizationStamp {
  const p = parseSeekerProfile(typeof raw === 'string' ? raw : '');
  return {
    v: 1,
    concrete: wantsConcrete(p),
    calm: wantsCalm(p),
    noSales: wantsNoSales(p),
    eventDate: p.hasEvent === 'yes' ? parseEventDate(p.eventText, today) : null,
  };
}

export interface DayView {
  date: string;
  score: number;
  /** "13:43–15:07", or null. */
  rahuKaal: string | null;
  slots: { label: string; score: number; rahuKaal: boolean }[];
}

export interface MonthView {
  /** "November 2026" */
  month: string;
  score: number | null;
  theme: string | null;
}

/** The three strongest, separate hours of a day, outside Rahu Kaal. */
export function bestHoursOf(d: DayView, n = 3): string[] {
  const ranked = d.slots
    .map((s, i) => ({ ...s, i }))
    .filter((s) => !s.rahuKaal)
    .sort((a, b) => b.score - a.score);
  const picked: typeof ranked = [];
  for (const s of ranked) {
    if (picked.every((p) => Math.abs(p.i - s.i) > 1)) picked.push(s);
    if (picked.length === n) break;
  }
  return picked.sort((a, b) => a.i - b.i).map((s) => s.label);
}

export type EventView =
  | {
      kind: 'in_window';
      text: string;
      date: string;
      score: number;
      word: string;
      bestHours: string[];
      rahuKaal: string | null;
      /** Days either side, so the day can be compared with its neighbours. */
      around: { date: string; score: number; word: string }[];
      /** The strongest of the seven days before it, for preparation, when one exists. */
      prepDay: { date: string; score: number; hours: string[] } | null;
    }
  | { kind: 'beyond'; text: string; date: string; month: string | null; monthScore: number | null; theme: string | null }
  | { kind: 'past'; text: string; date: string }
  | { kind: 'undated'; text: string | null; soon: boolean; best: { date: string; score: number; word: string; hours: string[] }[] };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function monthLabelOf(iso: string): string {
  const [y, m] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export function buildEventView(p: SeekerProfile, days: DayView[], months: MonthView[]): EventView | null {
  if (!p.hasEvent || p.hasEvent === 'no' || days.length === 0) return null;
  const start = days[0].date;
  const end = days[days.length - 1].date;
  const date = p.hasEvent === 'yes' ? parseEventDate(p.eventText, start) : null;

  if (!date) {
    const best = [...days]
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({ date: d.date, score: d.score, word: dayWord(d.score), hours: bestHoursOf(d) }));
    return { kind: 'undated', text: p.hasEvent === 'yes' ? p.eventText : null, soon: p.hasEvent === 'soon', best };
  }
  const text = p.eventText ?? '';
  if (date < start) return { kind: 'past', text, date };
  if (date > end) {
    const label = monthLabelOf(date);
    const m = months.find((x) => x.month === label) ?? null;
    return { kind: 'beyond', text, date, month: m ? m.month : null, monthScore: m?.score ?? null, theme: m?.theme ?? null };
  }
  const day = days.find((d) => d.date === date);
  if (!day) return { kind: 'undated', text, soon: false, best: [] };
  const around = [-3, -2, -1, 1, 2, 3]
    .map((n) => days.find((d) => d.date === addDays(date, n)))
    .filter((d): d is DayView => Boolean(d))
    .map((d) => ({ date: d.date, score: d.score, word: dayWord(d.score) }));
  const before = days.filter((d) => d.date < date && daysBetween(d.date, date) <= 7);
  const prep = before.length ? before.reduce((a, b) => (b.score > a.score ? b : a)) : null;
  return {
    kind: 'in_window',
    text,
    date,
    score: day.score,
    word: dayWord(day.score),
    bestHours: bestHoursOf(day),
    rahuKaal: day.rahuKaal,
    around,
    prepDay: prep ? { date: prep.date, score: prep.score, hours: bestHoursOf(prep, 2) } : null,
  };
}

// ── order and provenance ────────────────────────────────────────────────────────

export const FORECAST_BASE_ORDER: ForecastKey[] = ['decide', 'monthly', 'weekly', 'daily', 'correlations', 'synthesis'];

export interface ForecastOrder {
  order: ForecastKey[];
  /** Why a section was moved up, for the sections that were. */
  moved: Partial<Record<ForecastKey, string>>;
}

export function forecastOrder(p: SeekerProfile): ForecastOrder {
  const lead: ForecastKey[] = [];
  const moved: ForecastOrder['moved'] = {};
  const pull = (k: ForecastKey, why: string) => {
    if (!lead.includes(k)) lead.push(k);
    moved[k] = moved[k] ? `${moved[k]}, and because ${why}` : why;
  };
  if (p.hasEvent === 'yes' || p.hasEvent === 'soon') pull('decide', p.eventText ? `you told us about “${p.eventText}”` : 'you have a decision coming up');
  if (p.granularity === 'months') pull('monthly', 'you said the best months of a year would change how you plan');
  else if (p.granularity === 'days') pull('weekly', 'you said the best days of a month would change how you plan');
  else if (p.granularity === 'hours') pull('daily', 'you said the best hours of a day would change how you plan');
  const order = [...lead, ...FORECAST_BASE_ORDER.filter((k) => !lead.includes(k))];
  return { order, moved };
}

export interface WhyContext {
  profile: SeekerProfile;
  moved: ForecastOrder['moved'];
  eventDate: string | null;
  stamp: PersonalizationStamp | null;
}

export function forecastWhy(key: ForecastKey, c: WhyContext): string {
  const p = c.profile;
  const area = p.area && p.area !== 'curious' ? AREA_NAME[p.area] : null;
  const mv = c.moved[key];
  const out: string[] = [];
  switch (key) {
    case 'answer':
      out.push(p.labels.concern ? `You told us what was weighing on you (“${p.labels.concern}”), so your answer comes first.` : 'You told us what you wanted to know, so your answer comes first.');
      break;
    case 'snapshot':
      out.push(area ? `A one-glance view of the next weeks and months, framed around ${area}, which is what you said matters most.` : 'A one-glance view of the next weeks and months.');
      break;
    case 'today':
      out.push('Today comes first because a forecast is only useful from where you are standing now.');
      break;
    case 'decide':
      out.push(area ? `It filters the timing by area of life, and ${area} is yours.` : 'It filters the timing by area of life.');
      if (mv) out.push(`It is near the top because ${mv}.`);
      break;
    case 'monthly':
      out.push(p.duration === 'years' || p.duration === 'year' ? 'Something that has been on your mind this long is best read across months, not single days.' : 'The year view sets the background for the next 30 days.');
      if (mv) out.push(`It is near the top because ${mv}.`);
      break;
    case 'weekly':
      out.push('Weeks are where most plans are actually made.');
      if (mv) out.push(`It is near the top because ${mv}.`);
      break;
    case 'daily':
      out.push(c.stamp?.concrete ? 'You said astrology has felt vague, so each day ends with one specific window to use.' : 'Each day, hour by hour, so you can pick the window for what you are doing.');
      if (mv) out.push(`It is near the top because ${mv}.`);
      break;
    case 'correlations':
      out.push('Patterns in your own scores over these weeks, so the advice rests on your chart and not on averages.');
      break;
    case 'synthesis':
      out.push(c.eventDate && p.eventText ? `The strongest and quietest dates in this period, including those around “${p.eventText}”.` : 'The strongest and quietest dates in this period, in one place.');
      break;
    case 'chart':
      out.push(
        p.timeConfidence === 'unknown'
          ? 'You said your birth time is not known, so this shows how the chart was cast and what that limits.'
          : p.timeConfidence === 'approx'
            ? 'You said your birth time is approximate, so this shows the chart the scores rest on.'
            : 'The chart every score above rests on.',
      );
      break;
  }
  return out.join(' ');
}

// ── the brief ──────────────────────────────────────────────────────────────────

export interface ForecastBrief {
  heading: string;
  selections: { topic: string; value: string }[];
  arrangement: string[];
  /** A caution about how far the scores can be trusted, from the reader's birth-time answer. */
  timeNote: string | null;
  event: EventView | null;
  order: ForecastOrder;
  profile: SeekerProfile;
  eventDate: string | null;
}

export interface BriefInput {
  personalContext: string | null | undefined;
  name?: string | null;
  days: DayView[];
  months: MonthView[];
  stamp?: PersonalizationStamp | null;
  /** The rising sign the scores were cast from, to name in the time note. */
  lagna?: string | null;
}

export function buildForecastBrief(input: BriefInput): ForecastBrief | null {
  const p = parseSeekerProfile(input.personalContext ?? '');
  if (!hasAnyAnswer(p)) return null;
  const first = (input.name ?? '').trim().split(/\s+/)[0];
  const start = input.days[0]?.date ?? new Date().toISOString().slice(0, 10);
  const eventDate = p.hasEvent === 'yes' ? parseEventDate(p.eventText, start) : null;
  const order = forecastOrder(p);
  const stamp = input.stamp ?? null;
  const arrangement: string[] = [];

  for (const k of order.order) {
    const why = order.moved[k];
    if (why) arrangement.push(`“${SECTION_NAME[k]}” is near the top because ${why}.`);
  }
  if (stamp?.concrete) arrangement.push('You said astrology has felt vague. Each daily note ends with one specific window from your own chart.');
  if (stamp?.calm) arrangement.push('You said astrology has made you anxious. The writing keeps warnings out and talks about patience instead.');
  if (stamp?.noSales) arrangement.push('You said pressure to buy things has bothered you. Nothing in this forecast suggests a gemstone, ritual or purchase.');
  if (p.prior === 'never') arrangement.push('You have not consulted an astrologer before, so astrology terms are explained when they first appear.');
  else if (p.prior === 'often') arrangement.push('You have consulted astrologers often, so the basics are skipped.');
  if (eventDate && p.eventText) arrangement.push(`The days around ${longDate(eventDate)} have their own card below.`);
  if (p.partnerName) arrangement.push(`${p.partnerName} is named in your answers; this forecast reads your chart only, because there is no chart for ${p.partnerName}.`);
  const sit = p.detail ? SITUATIONS[p.detail] : null;
  if (sit) arrangement.push(`Advice is aimed at your situation: ${sit.clause}.`);

  let timeNote: string | null = null;
  if (p.timeConfidence === 'unknown') {
    timeNote = `You said your birth time is not known, so the rising sign used to score each day${input.lagna ? ` (${input.lagna})` : ''} was estimated from a noon chart. Every score here depends on it, so treat the scores as a guide. Rahu Kaal times do not depend on your chart.`;
  } else if (p.timeConfidence === 'approx') {
    timeNote = `You said your birth time is approximate. If your real rising sign differs from the one used${input.lagna ? ` (${input.lagna})` : ''}, every score here shifts. Rahu Kaal times do not depend on your chart.`;
  }

  return {
    heading: first ? `${first}, here is what you told us` : 'What you told us',
    selections: selectionsOf(p, eventDate).map((s) => ({ topic: s.topic, value: s.value })),
    arrangement,
    timeNote,
    event: buildEventView(p, input.days, input.months),
    order,
    profile: p,
    eventDate,
  };
}

export const SECTION_NAME: Record<ForecastKey, string> = {
  answer: 'Your question',
  snapshot: 'Your forecast at a glance',
  today: 'Today',
  decide: 'Timing by area of life',
  monthly: 'Month by month',
  weekly: 'Week by week',
  daily: 'Day by day, hour by hour',
  correlations: 'Your personal rhythm',
  synthesis: 'Strongest and quietest dates',
  chart: 'About your birth chart',
};

export { TIME_LABEL };
