/**
 * Karmic Blueprint generator: engine facts → structured JSON → model narrative → lint.
 *
 * Three phases, each returning plain JSON so each can be its own durable Inngest step:
 *   1. prepareBlueprint   chart, birth-time check, 12 months of windows, calculated sections
 *   2. narrateGroup       the model writes one group of sections, under the content lint
 *   3. assembleBlueprint  merge, keep the lint's verdicts, stamp the quality record
 * `generateBlueprint` runs all three in order for tests and local dry-runs.
 *
 * Only the ports in ./deps.ts touch the outside world, so the whole thing runs with fakes.
 */

import { SIGNS, signIndex, type Sign } from '@/lib/funnel/reveal/astro';
import { parseSeekerProfile } from '@/lib/personalization/parse';
import { addDays, parseEventDate } from '@/lib/personalization/eventDate';
import { wantsCalm, type SeekerProfile } from '@/lib/personalization/profile';
import type { NatalChartData } from '@/lib/agents/types';
import type { BlueprintDeps, GridDay, LlmPort } from './deps';
import { bannedHits } from './lint';
import { buildBlueprintFacts, type BlueprintFacts } from './facts';
import { buildBrief, planBlueprint, writingDirectives, type PlanKind } from './personalize';
import { buildSection, type BuildCtx } from './sections';
import { analyzeTimeSensitivity, type SensitivityVariant } from './sensitivity';
import { computeNodalWindows, natalPoints, pickWindows, type NodeSample } from './transits';
import { writeNarrative, type NarrativeOutcome } from './narrative';
import type { BlueprintBrief, BlueprintDoc, BlueprintSection, NarrativeSpec, SectionId } from './types';

export interface GenerateInput {
  name: string;
  /** YYYY-MM-DD */
  birthDate: string;
  /** HH:MM (24h, local). Ignored when the time is unknown. */
  birthTime: string | null;
  city: string;
  lat: number;
  lng: number;
  /** `reports.personal_context`, as written by the quiz. */
  personalContext: string;
  plan: PlanKind;
  /** YYYY-MM-DD in the reader's timezone. */
  today: string;
}

/** Shift a local date/time by whole minutes (for the ± birth-time check). */
export function shiftLocal(date: string, hhmm: string, deltaMin: number): { date: string; time: string } {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + deltaMin;
  const dayShift = Math.floor(total / 1440);
  const mins = ((total % 1440) + 1440) % 1440;
  return {
    date: dayShift === 0 ? date : addDays(date, dayShift),
    time: `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}:00`,
  };
}

const APPROX_OFFSETS = [-120, -60, 60, 120];
const LOOKBACK_DAYS = 56;
/** Sections written together in one model call. A failing section is retried alone. */
export const NARRATIVE_GROUPS: SectionId[][] = [['ketu', 'rahu', 'axis'], ['fifth_ninth', 'dasha', 'debt'], ['windows', 'focus', 'event', 'partner']];

/** The dasha running on a given date, from the chart's own sequence. */
export function dashaOn(chart: NatalChartData, date: string): { maha: string; antar: string | null } | null {
  const m = (chart.dasha_sequence ?? []).find((d) => date >= d.start_date && date <= d.end_date);
  if (!m) return null;
  const a = (m.antardasha ?? []).find((x) => date >= x.start_date && date <= x.end_date);
  return { maha: m.planet, antar: a?.planet ?? null };
}

function lonOf(p: { sign: string; degree: number } | undefined): number | null {
  if (!p) return null;
  const i = SIGNS.indexOf(p.sign as Sign);
  return i < 0 ? null : i * 30 + p.degree;
}

/** Weekly Rahu and Sun longitudes for a year from the engine's own daily grid. */
export function samplesFromGrid(days: GridDay[]): NodeSample[] {
  const out: NodeSample[] = [];
  for (const d of days) {
    const rahu = lonOf(d.planet_positions?.planets?.Rahu);
    const sun = lonOf(d.planet_positions?.planets?.Sun);
    if (rahu !== null && sun !== null) out.push({ date: d.date, rahuLon: rahu, sunLon: sun });
  }
  return out;
}

export function weeklyDates(from: string, weeks = 54): string[] {
  return Array.from({ length: weeks }, (_, i) => addDays(from, i * 7));
}

/** A banned word in the reader's own event text is theirs to write; the model is told to say "a personal date" instead. */
function modelSafeProfile(p: SeekerProfile): SeekerProfile {
  if (p.eventText && bannedHits(p.eventText).length) return { ...p, eventText: 'a personal date' };
  return p;
}

// ── phase 1 ────────────────────────────────────────────────────────────────────

export interface PreparedBlueprint {
  v: 1;
  name: string;
  plan: PlanKind;
  today: string;
  reference: 'lagna' | 'moon';
  referenceSign: Sign;
  timeConfidence: 'exact' | 'approx' | 'unknown';
  brief: BlueprintBrief;
  /** In the order this reader's answers produce. */
  built: { id: SectionId; section: BlueprintSection; narrative: NarrativeSpec | null }[];
  /** What the model is told about the reader (an unsafe typed word replaced). */
  safeProfile: SeekerProfile;
  directives: string[];
  eventDate: string | null;
  /** Words the reader typed, so repeating them is not "ungrounded". */
  extraAllow: string;
  calm: boolean;
}

export async function prepareBlueprint(input: GenerateInput, deps: Pick<BlueprintDeps, 'ephemeris'>): Promise<PreparedBlueprint> {
  const profile = parseSeekerProfile(input.personalContext);
  const timeConfidence = profile.timeConfidence ?? (input.birthTime && input.birthTime !== '12:00' ? 'exact' : 'unknown');
  const time = timeConfidence === 'unknown' || !input.birthTime ? '12:00' : input.birthTime;
  const natalAt = (date: string, t: string) => deps.ephemeris.natalChart({ date, time: t, city: input.city, lat: input.lat, lng: input.lng });

  // 1. The chart, and — when the time is approximate — the chart at ±1 and ±2 hours.
  const chart = await natalAt(input.birthDate, `${time}:00`);
  const variants: SensitivityVariant[] = [];
  if (timeConfidence === 'unknown') {
    // No time at all: see how far the Moon, and with it every house and dasha date, could move across the day.
    for (const [off, t] of [[-715, '00:05'], [715, '23:55']] as const) variants.push({ offsetMin: off, chart: await natalAt(input.birthDate, `${t}:00`) });
  } else if (timeConfidence === 'approx') {
    for (const off of APPROX_OFFSETS) {
      const s = shiftLocal(input.birthDate, time, off);
      variants.push({ offsetMin: off, chart: await natalAt(s.date, s.time) });
    }
  }
  const facts: BlueprintFacts = buildBlueprintFacts({ chart, timeConfidence, today: input.today });
  const sensitivity = analyzeTimeSensitivity(chart, timeConfidence, input.today, variants);

  // 2. The reader's date, and the plan their answers produce.
  const eventDate = profile.hasEvent === 'yes' ? parseEventDate(profile.eventText, input.today) : null;
  const plan = planBlueprint(profile, { plan: input.plan, eventDate });

  // 3. A year of Rahu–Ketu windows from weekly samples of the engine's own positions.
  const refIdx = signIndex(facts.referenceSign);
  // Start eight weeks back so a window already under way shows its real start, not today's date.
  const lookbackFrom = addDays(input.today, -LOOKBACK_DAYS);
  const yearGrid = await deps.ephemeris.dailyGrid({ dates: weeklyDates(lookbackFrom, 62), lat: input.lat, lng: input.lng, lagnaSignIndex: refIdx });
  const natal = natalPoints(
    Object.fromEntries(Object.entries(facts.planets).map(([k, v]) => [k, { sign: v.sign, degree: v.degree }])),
    facts.lagna,
  );
  const allWindows = computeNodalWindows({
    samples: samplesFromGrid(yearGrid),
    natal,
    reference: facts.referenceSign,
    focusHouses: plan.focusHouses,
    from: lookbackFrom,
    to: addDays(input.today, 365),
    today: input.today,
  }).filter((w) => w.end >= input.today);
  const windows = pickWindows(allWindows, 7);

  // 4. Days around the reader's date, and the 30-day add-on.
  let eventGrid: GridDay[] | null = null;
  if (eventDate && eventDate >= input.today && eventDate <= addDays(input.today, 400)) {
    const lo = eventDate > addDays(input.today, 3) ? addDays(eventDate, -3) : input.today;
    const dates = Array.from({ length: 7 }, (_, i) => addDays(lo, i));
    try {
      eventGrid = await deps.ephemeris.dailyGrid({ dates, lat: input.lat, lng: input.lng, lagnaSignIndex: refIdx });
    } catch (e) {
      console.warn('[blueprint] event grid unavailable:', e instanceof Error ? e.message : e);
    }
  }
  const thirtyGrid =
    input.plan === 'blueprint_plus30'
      ? await deps.ephemeris.dailyGrid({ dates: Array.from({ length: 30 }, (_, i) => addDays(input.today, i)), lat: input.lat, lng: input.lng, lagnaSignIndex: refIdx })
      : null;

  const ctx: BuildCtx = {
    name: input.name,
    profile,
    facts,
    plan,
    planKind: input.plan,
    sensitivity,
    allWindows,
    windows,
    eventGrid,
    eventDasha: eventDate ? dashaOn(chart, eventDate) : null,
    thirtyGrid,
    today: input.today,
  };

  // 5. Calculated skeletons, in the order this reader's answers produce.
  const built: PreparedBlueprint['built'] = [];
  for (const id of plan.order) {
    const b = buildSection(id, ctx);
    if (b) built.push({ id, section: b.section, narrative: b.narrative });
  }

  const safe = modelSafeProfile(profile);
  return {
    v: 1,
    name: input.name,
    plan: input.plan,
    today: input.today,
    reference: facts.reference,
    referenceSign: facts.referenceSign,
    timeConfidence,
    brief: buildBrief(profile, plan, facts, input.name),
    built,
    safeProfile: safe,
    directives: writingDirectives(safe, facts, plan),
    eventDate,
    extraAllow: [profile.eventText, profile.partnerName, profile.priorQuestion].filter(Boolean).join(' '),
    calm: wantsCalm(profile),
  };
}

// ── phase 2 ────────────────────────────────────────────────────────────────────

/** The groups of sections that actually need the model for this reader. */
export function narrativeGroups(p: PreparedBlueprint): NarrativeSpec[][] {
  const specs = p.built.map((b) => b.narrative).filter((n): n is NarrativeSpec => n !== null);
  return NARRATIVE_GROUPS.map((ids) => specs.filter((s) => ids.includes(s.id))).filter((g) => g.length > 0);
}

export async function narrateGroup(p: PreparedBlueprint, group: NarrativeSpec[], llm: LlmPort): Promise<NarrativeOutcome> {
  return writeNarrative({
    specs: group,
    profile: p.safeProfile,
    directives: p.directives,
    eventDate: p.eventDate,
    name: p.name,
    llm,
    extraAllow: p.extraAllow,
  });
}

// ── phase 3 ────────────────────────────────────────────────────────────────────

export function assembleBlueprint(p: PreparedBlueprint, outcomes: NarrativeOutcome[], now: Date = new Date()): BlueprintDoc {
  const accepted: NarrativeOutcome['accepted'] = Object.assign({}, ...outcomes.map((o) => o.accepted));
  const flagged = outcomes.flatMap((o) => o.flagged);
  const flaggedIds = new Set(flagged.map((f) => f.id));

  // A flagged section keeps its calculated paragraphs and gains our own traditional reading.
  const sections: BlueprintSection[] = p.built.map(({ id, section, narrative }) => {
    if (narrative && flaggedIds.has(id)) {
      const fallback = narrative.fallback
        .filter((t) => t && bannedHits(t, { calm: p.calm }).length === 0)
        .map((t) => ({ text: t, kind: 'interpretation' as const, source_keys: narrative.facts.slice(0, 2).map((f) => f.key) }));
      return { ...section, paragraphs: [...section.paragraphs, ...fallback], flagged: true };
    }
    return { ...section, paragraphs: [...section.paragraphs, ...(accepted[id] ?? [])] };
  });

  const calls = outcomes.reduce((n, o) => n + o.calls, 0);
  const priced = outcomes.every((o) => o.costUsd !== null);
  const models: string[] = [];
  for (const o of outcomes) for (const m of o.models) if (!models.includes(m)) models.push(m);
  return {
    kind: 'blueprint',
    version: 1,
    generatedAt: now.toISOString(),
    plan: p.plan,
    name: p.name,
    reference: p.reference,
    referenceSign: p.referenceSign,
    timeConfidence: p.timeConfidence,
    brief: p.brief,
    sections,
    qa: {
      lintRetries: outcomes.reduce((n, o) => n + o.retries, 0),
      flaggedSections: flagged.map((f) => f.id),
      models,
      usage: calls > 0 ? { input: outcomes.reduce((n, o) => n + o.usage.input, 0), output: outcomes.reduce((n, o) => n + o.usage.output, 0) } : null,
      costUsd: calls > 0 && priced ? outcomes.reduce((n, o) => n + (o.costUsd ?? 0), 0) : null,
      calls,
      flagReasons: Object.fromEntries(flagged.map((f) => [f.id, f.reasons])),
    },
  };
}

/** All three phases in order. Used by tests and the local dry-run; production runs them as separate steps. */
export async function generateBlueprint(input: GenerateInput, deps: BlueprintDeps, now: Date = new Date()): Promise<BlueprintDoc> {
  const prepared = await prepareBlueprint(input, deps);
  const outcomes: NarrativeOutcome[] = [];
  for (const group of narrativeGroups(prepared)) outcomes.push(await narrateGroup(prepared, group, deps.llm));
  return assembleBlueprint(prepared, outcomes, now);
}
