/**
 * RAG + LLM narrative layer for the deep Kundli report.
 *
 * Mirrors the synastryCommentary pattern: try RAG-grounded LLM generation,
 * fall back to deterministic, fact-specific prose if no credentials are present
 * or any call fails. Never returns empty sections.
 *
 * EFFICIENCY: exactly THREE LLM calls per report (overview, all 7 life areas in
 * one call, all 5 year sections in one call) to stay within serverless limits.
 * Every network call is wrapped in try/catch with a deterministic fallback.
 */

import { searchScripturesHybrid } from '@/lib/rag/vectorSearch';
import { completeLlmChat } from '@/lib/llm/routeCompletion';
import { sanitizePersonalContext } from '@/lib/utils/sanitize';
import type { NatalChartData } from '@/lib/agents/types';
import type { DeepKundliData, YearOutlookSeed } from './deepKundli';
import type { DoshaFlag } from './doshas';

export type LifeArea =
  | 'life'
  | 'career_finances'
  | 'relationships'
  | 'marriage_intimacy'
  | 'health'
  | 'children'
  | 'family';

export interface KundliSections {
  overview: string;
  lifeAreas: Record<LifeArea, string>;
  yearOutlook: Array<{ year: number; text: string }>;
}

const LIFE_AREAS: LifeArea[] = [
  'life',
  'career_finances',
  'relationships',
  'marriage_intimacy',
  'health',
  'children',
  'family',
];

const LIFE_AREA_TITLES: Record<LifeArea, string> = {
  life: 'Life path and character',
  career_finances: 'Career and finances',
  relationships: 'Relationships and connection',
  marriage_intimacy: 'Marriage and intimacy',
  health: 'Health and vitality',
  children: 'Children',
  family: 'Family and home',
};

const SYSTEM_PROMPT = `You are a warm, precise Vedic astrologer writing a personal birth-chart reading. You sound like a trusted advisor who has studied the classical texts and genuinely cares about the person in front of you.

RULES:
- Reason ONLY from the computed facts supplied in the brief. NEVER invent planetary positions, signs, houses, degrees, dashas, or dosha findings — if a detail is not in the brief, do not state it.
- Plain English only. NEVER use jargon words: kendra, trikona, dusthana, badhaka, yogakaraka, or H-notation (like "7H"). Say "the marriage area of the chart", "the career sector", etc.
- Warm, specific, and grounded. Refer to the person by name where natural.
- Be compassionate and non-fatalistic about doshas and health. A dosha is a pattern to work with, never a sentence. Never predict illness, death, divorce, or disaster. Never guarantee outcomes (no "you will definitely…").
- If classical references are provided, weave their wisdom in lightly as supporting context.
- Return ONLY the requested prose. No preamble, no markdown headers unless explicitly asked for delimiter lines.`;

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function hasApiKey(): boolean {
  return !!(process.env.ANTHROPIC_API_KEY ?? process.env.OPENAI_API_KEY ?? '').trim();
}

interface RagHit {
  source: string;
  chapter?: string;
  text: string;
}

async function fetchRag(query: string): Promise<RagHit[]> {
  try {
    const hits = await searchScripturesHybrid(query, 3);
    return Array.isArray(hits)
      ? hits.map((h) => ({ source: h.source, chapter: h.chapter, text: h.text }))
      : [];
  } catch {
    return [];
  }
}

function renderRag(hits: RagHit[]): string {
  if (hits.length === 0) return '';
  const blocks = hits
    .map((h) => {
      const t = h.text.length > 220 ? `${h.text.slice(0, 220)}…` : h.text;
      return `- (${h.source}${h.chapter ? `, ${h.chapter}` : ''}) ${t}`;
    })
    .join('\n');
  return `\n\nClassical references you may draw on (supporting wisdom only):\n${blocks}`;
}

/** Find the occupants of a given house number from the deep bundle. */
function occupantsOf(deep: DeepKundliData, house: number): string[] {
  return deep.houseHighlights.find((h) => h.house === house)?.occupants ?? [];
}

/** Sign on a given house number. */
function signOnHouse(deep: DeepKundliData, house: number): string {
  return deep.houseHighlights.find((h) => h.house === house)?.sign ?? '';
}

/** Where (sign) a planet sits in the birth chart, from the house highlights. */
function planetSign(chart: NatalChartData, planet: string): string {
  return chart.planets?.[planet]?.sign ?? '';
}
function planetHouse(chart: NatalChartData, planet: string): number | undefined {
  return chart.planets?.[planet]?.house;
}

function describeDosha(flag: DoshaFlag, label: string): string {
  if (!flag.present) return `${label}: not indicated`;
  return `${label}: present (${flag.severity})`;
}

/** Build the compact factual brief shared across calls. */
function buildBaseBrief(chart: NatalChartData, deep: DeepKundliData, name: string): string {
  const lagnaLordSign = planetSign(chart, deep.lagnaLord);
  const lagnaLordHouse = planetHouse(chart, deep.lagnaLord);
  const moonD9 = deep.vargas.d9['Moon'] ?? '';
  const venusD9 = deep.vargas.d9['Venus'] ?? '';
  const lordD9 = deep.vargas.d9[deep.lagnaLord] ?? '';

  const houseLines = deep.houseHighlights
    .filter((h) => h.occupants.length > 0)
    .map((h) => `  House ${h.house} (${h.sign}): ${h.occupants.join(', ')}`)
    .join('\n');

  return [
    `PERSON: ${name}`,
    `Ascendant (rising sign): ${deep.lagna}; its ruling planet ${deep.lagnaLord} sits in ${lagnaLordSign || 'an unlisted sign'}${lagnaLordHouse ? ` (house ${lagnaLordHouse})` : ''}.`,
    `Moon sign: ${deep.moonSign}; Moon star (nakshatra): ${deep.moonNakshatra}.`,
    `Sun sign: ${deep.sunSign}.`,
    `Navamsa (deeper destiny layer): Moon → ${moonD9 || 'n/a'}, Venus → ${venusD9 || 'n/a'}, chart-ruler ${deep.lagnaLord} → ${lordD9 || 'n/a'}, rising → ${deep.vargas.d9Lagna}. ${deep.vargas.navamsaNote}`,
    `Planet placements (house: sign — occupants):\n${houseLines || '  (none listed)'}`,
    `Doshas — ${describeDosha(deep.doshas.manglik, 'Mangal')}; ${describeDosha(deep.doshas.kaalSarpa, 'Kaal Sarpa')}; ${describeDosha(deep.doshas.sadeSati, 'Sade Sati')}.`,
    `Current major period (dasha): ${chart.current_dasha?.mahadasha ?? 'n/a'} / ${chart.current_dasha?.antardasha ?? 'n/a'}.`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// (a) OVERVIEW
// ---------------------------------------------------------------------------

function fallbackOverview(chart: NatalChartData, deep: DeepKundliData, name: string): string {
  const lordSign = planetSign(chart, deep.lagnaLord);
  const md = chart.current_dasha?.mahadasha;
  const ad = chart.current_dasha?.antardasha;
  const doshaBits: string[] = [];
  if (deep.doshas.manglik.present) doshaBits.push(`a ${deep.doshas.manglik.severity} Mangal influence`);
  if (deep.doshas.kaalSarpa.present) doshaBits.push('a Kaal Sarpa pattern');
  if (deep.doshas.sadeSati.present) doshaBits.push(`a Sade Sati phase (${deep.doshas.sadeSati.severity})`);

  const doshaSentence = doshaBits.length
    ? ` The chart carries ${doshaBits.join(' and ')}, which are simply patterns to work with consciously rather than obstacles.`
    : ' The chart shows none of the commonly worried-about patterns (Mangal, Kaal Sarpa, or an active Sade Sati) at this time.';

  return (
    `${name}, your chart rises in ${deep.lagna}, so ${deep.lagnaLord} acts as the steward of your life's overall direction` +
    (lordSign ? `, and it is placed in ${lordSign}, which colours how you meet the world.` : '.') +
    ` Your Moon sits in ${deep.moonSign} under the star of ${deep.moonNakshatra}, shaping your instincts, comfort, and emotional rhythm, while your Sun in ${deep.sunSign} speaks to your core sense of self and vitality.` +
    doshaSentence +
    (md
      ? ` You are currently moving through a ${md}${ad ? `–${ad}` : ''} period, the prevailing seasonal weather over your life right now.`
      : '') +
    ` In the deeper Navamsa layer, ${deep.vargas.navamsaNote.charAt(0).toLowerCase()}${deep.vargas.navamsaNote.slice(1)} Taken together, this is a chart with real, workable strengths; the sections that follow look at each part of life in turn.`
  );
}

async function generateOverview(
  chart: NatalChartData,
  deep: DeepKundliData,
  name: string,
  brief: string,
): Promise<string> {
  if (!hasApiKey()) return fallbackOverview(chart, deep, name);

  const rag = renderRag(
    await fetchRag(`Vedic ${deep.lagna} ascendant ${deep.moonNakshatra} life purpose character birth chart`),
  );
  const userPrompt =
    `Write a warm ~250-word OVERVIEW of this person's birth chart, grounded entirely in the facts below.\n\n` +
    `FACTS:\n${brief}${rag}\n\n` +
    `Open with a human sentence about the overall shape of the chart, then touch on temperament (rising sign + Moon), core vitality (Sun), and the current life-period, and close on a grounded, hopeful note. Plain English, no jargon. Return only the prose.`;

  try {
    const raw = await completeLlmChat({ systemPrompt: SYSTEM_PROMPT, userPrompt, maxTokens: 600 });
    const t = raw.trim();
    return t.length >= 40 ? t : fallbackOverview(chart, deep, name);
  } catch (err) {
    console.warn('[kundliCommentary] overview LLM failed, using fallback:', err);
    return fallbackOverview(chart, deep, name);
  }
}

// ---------------------------------------------------------------------------
// (b) LIFE AREAS — one call, parsed into 7 sections
// ---------------------------------------------------------------------------

/** House(s) most relevant to each life area, for fact-specific fallbacks. */
const AREA_HOUSES: Record<LifeArea, number[]> = {
  life: [1],
  career_finances: [10, 2, 11],
  relationships: [7, 5],
  marriage_intimacy: [7, 8],
  health: [1, 6],
  children: [5],
  family: [4, 2],
};

function fallbackLifeArea(
  area: LifeArea,
  chart: NatalChartData,
  deep: DeepKundliData,
  name: string,
): string {
  const houses = AREA_HOUSES[area];
  const occ = houses.flatMap((h) => occupantsOf(deep, h));
  const primarySign = signOnHouse(deep, houses[0]);
  const occText = occ.length ? `${occ.join(', ')}` : 'no planet directly';
  const md = chart.current_dasha?.mahadasha;

  switch (area) {
    case 'life':
      return (
        `${name}, your life path is anchored by a ${deep.lagna} rising sign, with ${deep.lagnaLord} as its guide. ` +
        `Your ${deep.moonSign} Moon under ${deep.moonNakshatra} gives your days their emotional texture and the way you seek comfort and meaning. ` +
        `With ${occText} occupying the first part of your chart, your sense of self tends to be shaped accordingly, and the current ${md ?? 'ongoing'} period is part of how that unfolds now.`
      );
    case 'career_finances':
      return (
        `Your career sector (the tenth area, in ${primarySign}) is influenced by ${occText}, which shapes the kind of work that suits you. ` +
        `The income and resource areas of the chart suggest steady cultivation rather than overnight leaps. ` +
        `During the present ${md ?? 'ongoing'} period, ${name}, leaning into consistent effort and clear priorities tends to serve your finances best.`
      );
    case 'relationships':
      return (
        `Your relationship sector (the seventh area, in ${primarySign}) carries ${occText}, colouring how you connect with others. ` +
        `In the Navamsa, Venus moves to ${deep.vargas.d9['Venus'] ?? 'its own ground'}, which adds nuance to how affection matures. ` +
        `You tend to do best in partnerships where there is honesty and room to be yourself, ${name}.`
      );
    case 'marriage_intimacy': {
      const manglik = deep.doshas.manglik;
      const manglikLine = manglik.present
        ? ` There is a ${manglik.severity} Mangal influence here, which simply asks for patience and open communication in close partnership — it is common and very workable.`
        : ` No Mangal influence complicates this area at present, which is a gentle, supportive sign.`;
      return (
        `Marriage and intimacy live in the seventh and eighth parts of your chart, with ${occText} active there. ` +
        `${deep.vargas.navamsaNote}` +
        manglikLine +
        ` Warmth and trust, nurtured over time, are the real foundations for you, ${name}.`
      );
    }
    case 'health':
      return (
        `Your vitality is read from your ${deep.lagna} rising sign and ${deep.sunSign} Sun, with the wellbeing area of the chart shaped by ${occText}. ` +
        (deep.doshas.sadeSati.present
          ? `You are in a Sade Sati season, which mostly asks for steady rest, realistic pacing, and care for the basics — sleep, movement, and stress. `
          : `No Sade Sati phase is active right now, which supports steadier energy. `) +
        `None of this predicts any specific condition; treat it as a gentle nudge toward balanced self-care, ${name}.`
      );
    case 'children':
      return (
        `The children sector (the fifth area, in ${signOnHouse(deep, 5)}) carries ${occupantsOf(deep, 5).join(', ') || 'no planet directly'}, ` +
        `and the dedicated progeny chart (Saptamsa) places key indicators in ${deep.vargas.d7['Jupiter'] ?? 'their own signs'}. ` +
        `This area speaks to creativity and joy as much as to children themselves, ${name}, and is best read warmly rather than as any fixed prediction.`
      );
    case 'family':
      return (
        `Home and family are read from the fourth and second parts of your chart (in ${primarySign}), with ${occText} active there. ` +
        `Your ${deep.moonSign} Moon also speaks to your sense of roots and belonging. ` +
        `You are likely to value a stable emotional base, ${name}, and to give and draw strength from close family ties.`
      );
    default:
      return `This area of the chart is shaped by ${occText}.`;
  }
}

function parseLabeledSections(raw: string): Partial<Record<LifeArea, string>> {
  const out: Partial<Record<LifeArea, string>> = {};
  // Split on lines beginning with "### <area>".
  const regex = /^###\s+(life|career_finances|relationships|marriage_intimacy|health|children|family)\s*$/gim;
  const matches: Array<{ area: LifeArea; index: number; length: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(raw)) !== null) {
    matches.push({ area: m[1] as LifeArea, index: m.index, length: m[0].length });
  }
  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    const start = cur.index + cur.length;
    const end = i + 1 < matches.length ? matches[i + 1].index : raw.length;
    const body = raw.slice(start, end).trim();
    if (body) out[cur.area] = body;
  }
  return out;
}

async function generateLifeAreas(
  chart: NatalChartData,
  deep: DeepKundliData,
  name: string,
  brief: string,
): Promise<Record<LifeArea, string>> {
  const build = (over: Partial<Record<LifeArea, string>>): Record<LifeArea, string> => {
    const result = {} as Record<LifeArea, string>;
    for (const area of LIFE_AREAS) {
      const v = over[area]?.trim();
      result[area] = v && v.length >= 40 ? v : fallbackLifeArea(area, chart, deep, name);
    }
    return result;
  };

  if (!hasApiKey()) return build({});

  const rag = renderRag(
    await fetchRag(
      `Vedic astrology houses career marriage children health family ${deep.lagna} ${deep.lagnaLord}`,
    ),
  );

  const headerList = LIFE_AREAS.map((a) => `### ${a}  (${LIFE_AREA_TITLES[a]})`).join('\n');
  const userPrompt =
    `Write SEVEN life-area sections for this person's birth chart, each 120–160 words, grounded ONLY in the facts below.\n\n` +
    `FACTS:\n${brief}${rag}\n\n` +
    `Output the sections in this exact order, each preceded by its delimiter line on its own line (keep the delimiter EXACTLY as written, lowercase, no extra words):\n` +
    `### life\n### career_finances\n### relationships\n### marriage_intimacy\n### health\n### children\n### family\n\n` +
    `For reference the areas mean: ${headerList}.\n` +
    `Each section: plain English, warm, specific to the facts, compassionate and non-fatalistic on doshas/health/marriage, no guarantees, no jargon. Do not add any text outside the delimited sections.`;

  try {
    const raw = await completeLlmChat({ systemPrompt: SYSTEM_PROMPT, userPrompt, maxTokens: 2600 });
    return build(parseLabeledSections(raw));
  } catch (err) {
    console.warn('[kundliCommentary] life-areas LLM failed, using fallbacks:', err);
    return build({});
  }
}

// ---------------------------------------------------------------------------
// (c) YEAR OUTLOOK — one call, parsed into 5 sections
// ---------------------------------------------------------------------------

function fallbackYear(seed: YearOutlookSeed, deep: DeepKundliData, name: string): string {
  const tone =
    seed.headlineDignity === 'supportive'
      ? 'broadly supportive — a year that tends to reward initiative and steady building'
      : seed.headlineDignity === 'testing'
        ? 'more testing — a year that asks for patience, planning, and care, and that often builds lasting strength'
        : 'mixed — a year of two halves where timing and discernment matter';
  const adText = seed.antardashas.length
    ? `the influence of ${seed.antardashas.join(', then ')}`
    : 'the prevailing planetary period';
  return (
    `In ${seed.year}, ${name}, you remain under the ${seed.mahadasha} major period, with ${adText} shaping the year. ` +
    `The overall weather looks ${tone}. ` +
    `Practically, this is a good year to align effort with what your chart already supports — your ${deep.lagna} rising strengths and your ${deep.moonSign} Moon's instincts. ` +
    `Treat the ups and downs as seasons rather than verdicts, and keep your longer purpose in view.`
  );
}

function parseYearSections(raw: string, years: number[]): Record<number, string> {
  const out: Record<number, string> = {};
  const regex = /^###\s*YEAR\s+(\d+)\s*$/gim;
  const matches: Array<{ year: number; index: number; length: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(raw)) !== null) {
    matches.push({ year: Number(m[1]), index: m.index, length: m[0].length });
  }
  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    const start = cur.index + cur.length;
    const end = i + 1 < matches.length ? matches[i + 1].index : raw.length;
    const body = raw.slice(start, end).trim();
    if (body && years.includes(cur.year)) out[cur.year] = body;
  }
  return out;
}

async function generateYearOutlook(
  chart: NatalChartData,
  deep: DeepKundliData,
  name: string,
  brief: string,
): Promise<Array<{ year: number; text: string }>> {
  const years = deep.fiveYear.map((s) => s.year);
  const build = (over: Record<number, string>): Array<{ year: number; text: string }> =>
    deep.fiveYear.map((seed) => {
      const v = over[seed.year]?.trim();
      return {
        year: seed.year,
        text: v && v.length >= 40 ? v : fallbackYear(seed, deep, name),
      };
    });

  if (!hasApiKey()) return build({});

  const seedLines = deep.fiveYear
    .map(
      (s) =>
        `  YEAR ${s.year}: major period ${s.mahadasha}; sub-periods ${s.antardashas.join(', ') || 'n/a'}; overall tone ${s.headlineDignity}.`,
    )
    .join('\n');

  const rag = renderRag(
    await fetchRag(`Vedic dasha transit yearly forecast ${deep.fiveYear[0]?.mahadasha ?? ''} timing`),
  );

  const userPrompt =
    `Write FIVE year-by-year outlook sections, each ~110 words, grounded ONLY in the facts and the per-year period data below.\n\n` +
    `BASE FACTS:\n${brief}\n\nPER-YEAR PERIODS:\n${seedLines}${rag}\n\n` +
    `Output one section per year in chronological order, each preceded by its delimiter line on its own line, formatted EXACTLY as "### YEAR <year>" (e.g. "### YEAR ${years[0]}").\n` +
    `Each section should translate that year's planetary period into grounded, plain-English guidance (themes to lean into, what to be mindful of). Non-fatalistic, no guarantees, no jargon. Do not add text outside the delimited sections.`;

  try {
    const raw = await completeLlmChat({ systemPrompt: SYSTEM_PROMPT, userPrompt, maxTokens: 2200 });
    return build(parseYearSections(raw, years));
  } catch (err) {
    console.warn('[kundliCommentary] year-outlook LLM failed, using fallbacks:', err);
    return build({});
  }
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Build the full Kundli commentary: overview, seven life-area sections, and a
 * five-year outlook. Exactly three LLM calls; deterministic fact-specific
 * fallbacks guarantee no section is ever empty.
 */
export async function buildKundliCommentary(
  chart: NatalChartData,
  deep: DeepKundliData,
  personName: string,
): Promise<KundliSections> {
  // Sanitize + cap the seeker's free-text name before it enters delimiter-parsed LLM
  // prompts. sanitizePersonalContext collapses newlines to spaces, so a forged
  // "\n### career_finances" / "\n### YEAR n" can't inject or overwrite a report section.
  const name = sanitizePersonalContext(personName, 80) || 'This person';
  const brief = buildBaseBrief(chart, deep, name);

  // Run the three calls in parallel; each self-contains its fallback.
  const [overview, lifeAreas, yearOutlook] = await Promise.all([
    generateOverview(chart, deep, name, brief),
    generateLifeAreas(chart, deep, name, brief),
    generateYearOutlook(chart, deep, name, brief),
  ]);

  return { overview, lifeAreas, yearOutlook };
}
