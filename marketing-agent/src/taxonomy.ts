/**
 * THE HOOK TAXONOMY — the prerequisite for learning from RESULTS.
 *
 * The lessons loop (src/lessons.ts) teaches the engine from REJECTIONS. It cannot teach it what
 * WORKS, because a posted reel's views are attached to a slug and a slug says nothing about the
 * shape of the creative. So every variant is tagged AT CREATION with four coordinates, and those
 * tags travel: creative JSON -> creative_variants (SQLite) -> marketing_assets (Supabase) ->
 * joined against marketing_stats by src/performance.ts -> back into the ideate/script prompts.
 *
 * That is the whole closed loop. Without these four fields there is nothing to join on and
 * "which hooks actually perform?" is unanswerable.
 *
 * Normalisation is DEFENSIVE on purpose: an LLM will emit "question", "Question/Dilemma",
 * "work/career" or nothing at all. A wrong-but-plausible tag is worse than a fallback, because it
 * silently pollutes the evidence the next batch is written from — so unknown values fall back to a
 * declared default rather than being invented.
 */

export const HOOK_FAMILIES = [
  'question_dilemma',
  'cost_time_anchor',
  'contrarian_respectful',
  'pov_relatable',
  'proof_demo',
  'curiosity_gap',
] as const;
export type HookFamily = (typeof HOOK_FAMILIES)[number];

export const DECISION_DOMAINS = [
  'work',
  'relationships',
  'family',
  'study',
  'money_timing',
  'health_routine',
  'other',
] as const;
export type DecisionDomain = (typeof DECISION_DOMAINS)[number];

export const EMOTIONAL_REGISTERS = ['anxious', 'hopeful', 'practical', 'playful'] as const;
export type EmotionalRegister = (typeof EMOTIONAL_REGISTERS)[number];

export interface CreativeTags {
  hookFamily: HookFamily;
  decisionDomain: DecisionDomain;
  emotionalRegister: EmotionalRegister;
  /** Intended finished length in seconds. Falls back to the sum of the shot list. */
  durationTargetSec: number;
}

export const DEFAULT_TAGS: CreativeTags = {
  hookFamily: 'question_dilemma',
  decisionDomain: 'other',
  emotionalRegister: 'practical',
  durationTargetSec: 25,
};

/** One-line description per family — used verbatim in the ideate/script prompt spec. */
export const HOOK_FAMILY_BRIEF: Record<HookFamily, string> = {
  question_dilemma: 'opens on a real either/or the viewer is actually holding ("11 baje ya 4 baje?")',
  cost_time_anchor: 'anchors on the time/effort of the old way versus ninety seconds on your phone',
  contrarian_respectful: 'corrects a generic belief without mocking the tradition or anyone in it',
  pov_relatable: 'a first-person moment the viewer has lived, shown rather than explained',
  proof_demo: 'shows the product doing the thing — the hour grid, a slot opening, the plain-English line',
  curiosity_gap: 'names something specific but withholds the answer until the payoff lands',
};

export const DECISION_DOMAIN_BRIEF: Record<DecisionDomain, string> = {
  work: 'meetings, negotiations, appraisals, interviews, publishing, launches',
  relationships: 'partners, proposals, difficult conversations, first meetings',
  family: 'parents, in-laws, household decisions, family events',
  study: 'exams, focused study blocks, applications, results',
  money_timing: 'when to make a considered financial move — never a return or outcome claim',
  health_routine: 'sleep, energy, routine, when the day actually runs clear',
  other: 'anything that fits none of the above',
};

// ---------------------------------------------------------------- normalisation

const normKey = (v: unknown): string =>
  String(v ?? '')
    .toLowerCase()
    .trim()
    .replace(/[\s/\-.]+/g, '_')
    .replace(/[^a-z_]/g, '');

/** Legacy config/creative-seeds.json family keys + the obvious model synonyms. */
const HOOK_ALIASES: Record<string, HookFamily> = {
  decision_moment: 'question_dilemma',
  question: 'question_dilemma',
  dilemma: 'question_dilemma',
  question_hook: 'question_dilemma',
  cost_anchor: 'cost_time_anchor',
  time_anchor: 'cost_time_anchor',
  cost: 'cost_time_anchor',
  respectful_contrarian: 'contrarian_respectful',
  contrarian: 'contrarian_respectful',
  pov: 'pov_relatable',
  relatable: 'pov_relatable',
  story: 'pov_relatable',
  demo: 'proof_demo',
  proof: 'proof_demo',
  product_demo: 'proof_demo',
  curiosity: 'curiosity_gap',
  open_loop: 'curiosity_gap',
};

const DOMAIN_ALIASES: Record<string, DecisionDomain> = {
  career: 'work',
  job: 'work',
  business: 'work',
  office: 'work',
  professional: 'work',
  work_career: 'work',
  love: 'relationships',
  partner: 'relationships',
  marriage: 'relationships',
  dating: 'relationships',
  parents: 'family',
  home: 'family',
  in_laws: 'family',
  exam: 'study',
  exams: 'study',
  education: 'study',
  academics: 'study',
  padhai: 'study',
  money: 'money_timing',
  finance: 'money_timing',
  financial: 'money_timing',
  investment: 'money_timing',
  health: 'health_routine',
  routine: 'health_routine',
  wellbeing: 'health_routine',
  sleep: 'health_routine',
  general: 'other',
  none: 'other',
};

const REGISTER_ALIASES: Record<string, EmotionalRegister> = {
  anxious: 'anxious',
  worried: 'anxious',
  nervous: 'anxious',
  stressed: 'anxious',
  hopeful: 'hopeful',
  optimistic: 'hopeful',
  warm: 'hopeful',
  reassuring: 'hopeful',
  practical: 'practical',
  matter_of_fact: 'practical',
  calm: 'practical',
  dry: 'practical',
  playful: 'playful',
  funny: 'playful',
  light: 'playful',
  cheeky: 'playful',
};

function coerce<T extends string>(raw: unknown, allowed: readonly T[], aliases: Record<string, T>, fallback: T): T {
  const k = normKey(raw);
  if (!k) return fallback;
  if ((allowed as readonly string[]).includes(k)) return k as T;
  if (aliases[k]) return aliases[k];
  // last resort: a containment match, so "work_meeting" still lands on "work"
  const hit = allowed.find((a) => k.includes(a)) ?? Object.keys(aliases).find((a) => k.includes(a));
  return hit ? ((allowed as readonly string[]).includes(hit) ? (hit as T) : aliases[hit]) : fallback;
}

export const toHookFamily = (v: unknown, fallback: HookFamily = DEFAULT_TAGS.hookFamily): HookFamily =>
  coerce(v, HOOK_FAMILIES, HOOK_ALIASES, fallback);

export const toDecisionDomain = (v: unknown, fallback: DecisionDomain = DEFAULT_TAGS.decisionDomain): DecisionDomain =>
  coerce(v, DECISION_DOMAINS, DOMAIN_ALIASES, fallback);

export const toEmotionalRegister = (v: unknown, fallback: EmotionalRegister = DEFAULT_TAGS.emotionalRegister): EmotionalRegister =>
  coerce(v, EMOTIONAL_REGISTERS, REGISTER_ALIASES, fallback);

/** Clamp to a sane reel length. `shotSeconds` is the honest fallback when the model omits it. */
export function toDurationTargetSec(v: unknown, shotSeconds = 0): number {
  const n = Number(v);
  const chosen = Number.isFinite(n) && n > 0 ? n : shotSeconds > 0 ? shotSeconds : DEFAULT_TAGS.durationTargetSec;
  return Math.round(Math.max(5, Math.min(90, chosen)));
}

/**
 * Normalise a loose tag object from an LLM (or from a stored payload) into the four coordinates.
 * `defaults` lets an idea's tags seed its variants' tags when the script stage omits them.
 */
export function normalizeTags(raw: any, defaults: Partial<CreativeTags> = {}, shotSeconds = 0): CreativeTags {
  const src = raw && typeof raw === 'object' ? raw : {};
  return {
    hookFamily: toHookFamily(src.hookFamily ?? src.hook_family ?? src.family, defaults.hookFamily ?? DEFAULT_TAGS.hookFamily),
    decisionDomain: toDecisionDomain(src.decisionDomain ?? src.decision_domain ?? src.domain, defaults.decisionDomain ?? DEFAULT_TAGS.decisionDomain),
    emotionalRegister: toEmotionalRegister(
      src.emotionalRegister ?? src.emotional_register ?? src.register,
      defaults.emotionalRegister ?? DEFAULT_TAGS.emotionalRegister,
    ),
    durationTargetSec: toDurationTargetSec(src.durationTargetSec ?? src.duration_target_sec ?? src.duration, shotSeconds || defaults.durationTargetSec || 0),
  };
}

// ---------------------------------------------------------------- buckets + keys

export const DURATION_BUCKETS = ['<=15s', '16-25s', '>25s'] as const;
export type DurationBucket = (typeof DURATION_BUCKETS)[number];

export function durationBucket(sec: number): DurationBucket {
  if (!Number.isFinite(sec) || sec <= 0) return '16-25s';
  if (sec <= 15) return '<=15s';
  if (sec <= 25) return '16-25s';
  return '>25s';
}

/** The unit an explore/exploit split reasons about: a hook family crossed with a domain. */
export const comboKey = (h: HookFamily, d: DecisionDomain): string => `${h}|${d}`;

export function allCombos(): { hookFamily: HookFamily; decisionDomain: DecisionDomain; key: string }[] {
  const out: { hookFamily: HookFamily; decisionDomain: DecisionDomain; key: string }[] = [];
  for (const h of HOOK_FAMILIES) {
    for (const d of DECISION_DOMAINS) {
      if (d === 'other') continue; // 'other' is a fallback bucket, never an exploration target
      out.push({ hookFamily: h, decisionDomain: d, key: comboKey(h, d) });
    }
  }
  return out;
}

/** The tag spec injected into any prompt that must emit tags. One source of truth. */
export function taxonomyPromptSpec(): string {
  return `TAGGING — every idea and every variant MUST carry these four fields. They are how the engine
learns which shapes actually perform, so guessing wrongly is worse than picking the obvious one.
- hookFamily: one of ${HOOK_FAMILIES.join(' | ')}
${HOOK_FAMILIES.map((f) => `    ${f}: ${HOOK_FAMILY_BRIEF[f]}`).join('\n')}
- decisionDomain: one of ${DECISION_DOMAINS.join(' | ')}
${DECISION_DOMAINS.map((d) => `    ${d}: ${DECISION_DOMAIN_BRIEF[d]}`).join('\n')}
- emotionalRegister: one of ${EMOTIONAL_REGISTERS.join(' | ')} — the feeling the viewer is in when the hook lands, not the tone of the voice-over.
- durationTargetSec: the intended finished length in seconds (a number). It must match the sum of your shot seconds.`;
}

/**
 * The same contract, one fifth the length, for prompts that ALREADY state the tags being worked
 * from (the script stage inherits the idea's tags). Prompt length is not free — the script stage
 * is the longest CLI call in the pipeline and it is already close to its wall-clock deadline.
 */
export function taxonomyPromptSpecCompact(): string {
  return `TAG SPEC (allowed values only — these are measurement, and a wrong tag corrupts the evidence the next batch is written from):
- hookFamily: ${HOOK_FAMILIES.join(' | ')}
- decisionDomain: ${DECISION_DOMAINS.join(' | ')}
- emotionalRegister: ${EMOTIONAL_REGISTERS.join(' | ')}
- durationTargetSec: a number, matching the sum of your shot seconds.`;
}
