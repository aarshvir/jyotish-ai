/**
 * Deterministic Guidance Builder
 *
 * Derives structured guidance from existing scoring inputs.
 * No LLM calls — purely deterministic from:
 *   - final slot score
 *   - hora planet
 *   - choghadiya name/quality
 *   - transit lagna house
 *   - Rahu Kaal status
 *   - panchang data
 *
 * This is the core of the V2 decision-support layer.
 */

import type { PanchangData } from '@/lib/agents/types';
import type {
  GuidanceLabel,
  ActionCategory,
  ReasonTag,
  SlotGuidanceV2,
  DayBriefingV2,
} from './types';
import { ALL_ACTION_CATEGORIES } from './types';
import { getGuidanceLabel } from './labels';

// ── Hora planet → action category affinities ─────────────────────────────────

const HORA_CATEGORY_BOOST: Record<string, Partial<Record<ActionCategory, number>>> = {
  Sun: { deep_work: 12, admin: 5, spiritual: 6 },
  Moon: { relationships: 12, creative: 8, spiritual: 6 },
  Mars: { deep_work: 10, admin: 4, travel: 3 },
  Mercury: { communication: 14, money: 6, admin: 8 },
  Jupiter: { spiritual: 12, communication: 6, relationships: 4 },
  Venus: { relationships: 10, creative: 12, money: 4 },
  Saturn: { admin: 14, deep_work: 6, spiritual: 4 },
};

// ── Transit house → category affinities ──────────────────────────────────────

const HOUSE_CATEGORY_BOOST: Record<number, Partial<Record<ActionCategory, number>>> = {
  1: { deep_work: 6, admin: 3 },
  2: { money: 10, communication: 6 },
  3: { communication: 10, travel: 4, creative: 3 },
  4: { relationships: 4, admin: 6 },
  5: { creative: 10, relationships: 6 },
  6: { admin: 8, deep_work: 4 },
  7: { relationships: 10, communication: 4, money: 4 },
  8: { spiritual: 6, deep_work: 4 },
  9: { spiritual: 10, travel: 8, communication: 3 },
  10: { deep_work: 10, money: 6, admin: 4 },
  11: { money: 8, communication: 6, relationships: 4 },
  12: { spiritual: 12, creative: 4 },
};

// ── Choghadiya → category penalty/boost ──────────────────────────────────────

const CHOGHADIYA_CATEGORY_MOD: Record<string, Partial<Record<ActionCategory, number>>> = {
  Amrit: { deep_work: 6, money: 6, communication: 6 },
  Shubh: { relationships: 4, creative: 4 },
  Labh: { money: 8, communication: 4 },
  Chal: {},
  Char: {},
  Udveg: { deep_work: -4, relationships: -6 },
  Rog: { deep_work: -6, money: -6, relationships: -4 },
  Kaal: { deep_work: -8, money: -8, communication: -6, relationships: -6 },
};

// ── Hora → reason tag generation ─────────────────────────────────────────────

const HORA_REASON: Record<string, { code: string; label: string; detail: string }> = {
  Sun: { code: 'hora_sun', label: 'Sun Hora', detail: 'Authority, leadership, and focused execution favored' },
  Moon: { code: 'hora_moon', label: 'Moon Hora', detail: 'Emotional intelligence, nurturing, and intuitive decisions favored' },
  Mars: { code: 'hora_mars', label: 'Mars Hora', detail: 'Decisive action, competition, and physical tasks favored' },
  Mercury: { code: 'hora_mercury', label: 'Mercury Hora', detail: 'Communication, analysis, trade, and documentation favored' },
  Jupiter: { code: 'hora_jupiter', label: 'Jupiter Hora', detail: 'Wisdom, teaching, consulting, and expansion favored' },
  Venus: { code: 'hora_venus', label: 'Venus Hora', detail: 'Relationships, aesthetics, luxury, and creative work favored' },
  Saturn: { code: 'hora_saturn', label: 'Saturn Hora', detail: 'Discipline, routine, audit, and completion of backlog favored' },
};

const CHOG_REASON: Record<string, { code: string; label: string; direction: 'supportive' | 'mixed' | 'challenging'; detail: string }> = {
  Amrit: { code: 'chog_amrit', label: 'Amrit Choghadiya', direction: 'supportive', detail: 'Nectar period — most auspicious for all new beginnings' },
  Shubh: { code: 'chog_shubh', label: 'Shubh Choghadiya', direction: 'supportive', detail: 'Auspicious — good for positive initiatives' },
  Labh: { code: 'chog_labh', label: 'Labh Choghadiya', direction: 'supportive', detail: 'Gains period — favorable for financial and growth activities' },
  Chal: { code: 'chog_chal', label: 'Chal Choghadiya', direction: 'mixed', detail: 'Neutral transition — suited for travel and ongoing work' },
  Char: { code: 'chog_char', label: 'Char Choghadiya', direction: 'mixed', detail: 'Neutral transition — suited for travel and ongoing work' },
  Udveg: { code: 'chog_udveg', label: 'Udveg Choghadiya', direction: 'challenging', detail: 'Tension period — suited for completion, not initiation' },
  Rog: { code: 'chog_rog', label: 'Rog Choghadiya', direction: 'challenging', detail: 'Strain period — avoid health risks and risky commitments' },
  Kaal: { code: 'chog_kaal', label: 'Kaal Choghadiya', direction: 'challenging', detail: 'Critical period — avoid new beginnings, use for review' },
};

// ── Category → human-readable names ──────────────────────────────────────────

const CATEGORY_NAMES: Record<ActionCategory, string> = {
  deep_work: 'focused work',
  communication: 'communication',
  money: 'financial decisions',
  relationships: 'relationships',
  travel: 'travel',
  creative: 'creative work',
  spiritual: 'spiritual practice',
  admin: 'admin and routine tasks',
};

// ── Slot guidance builder ────────────────────────────────────────────────────

export interface SlotGuidanceInput {
  score: number;
  hora_planet: string;
  choghadiya: string;
  transit_lagna_house: number;
  is_rahu_kaal: boolean;
  display_label: string;
  panchang?: Partial<PanchangData>;
}

export function buildSlotGuidance(input: SlotGuidanceInput): SlotGuidanceV2 {
  const { score, hora_planet, choghadiya, transit_lagna_house, is_rahu_kaal, display_label } = input;

  const label: GuidanceLabel = getGuidanceLabel(score, is_rahu_kaal);

  // Build reason tags
  const reason_tags: ReasonTag[] = [];

  const horaReason = HORA_REASON[hora_planet];
  if (horaReason) {
    const horaDir = ['Jupiter', 'Moon', 'Venus'].includes(hora_planet)
      ? 'supportive' as const
      : ['Saturn'].includes(hora_planet)
        ? 'challenging' as const
        : 'mixed' as const;
    reason_tags.push({
      ...horaReason,
      direction: horaDir,
      weight: 3,
    });
  }

  const chogReason = CHOG_REASON[choghadiya];
  if (chogReason) {
    reason_tags.push({
      code: chogReason.code,
      label: chogReason.label,
      direction: chogReason.direction,
      weight: 2,
      detail: chogReason.detail,
    });
  }

  if (is_rahu_kaal) {
    reason_tags.push({
      code: 'rahu_kaal',
      label: 'Rahu Kaal Active',
      direction: 'challenging',
      weight: 5,
      detail: 'Rahu Kaal window — avoid starting anything new or making important commitments',
    });
  }

  const houseDir = [1, 5, 9, 10, 11].includes(transit_lagna_house) ? 'supportive' as const
    : [6, 8, 12].includes(transit_lagna_house) ? 'challenging' as const
    : 'mixed' as const;
  reason_tags.push({
    code: `house_${transit_lagna_house}`,
    label: `Transit H${transit_lagna_house}`,
    direction: houseDir,
    weight: 2,
    detail: `Transit lagna in ${transit_lagna_house}${ordinalSuffix(transit_lagna_house)} house from natal lagna`,
  });

  // Build category scores (0-100 scale based on slot score + affinities)
  const category_scores = {} as Record<ActionCategory, number>;
  for (const cat of ALL_ACTION_CATEGORIES) {
    let catScore = score;
    catScore += HORA_CATEGORY_BOOST[hora_planet]?.[cat] ?? 0;
    catScore += HOUSE_CATEGORY_BOOST[transit_lagna_house]?.[cat] ?? 0;
    catScore += CHOGHADIYA_CATEGORY_MOD[choghadiya]?.[cat] ?? 0;
    if (is_rahu_kaal) catScore -= 20;
    category_scores[cat] = Math.max(5, Math.min(98, Math.round(catScore)));
  }

  // Sort categories by score
  const sorted = ALL_ACTION_CATEGORIES
    .map((cat) => ({ cat, score: category_scores[cat] }))
    .sort((a, b) => b.score - a.score);

  // Derive best_for, avoid_for, still_ok_for
  const best_for: string[] = [];
  const avoid_for: string[] = [];
  const still_ok_for: string[] = [];

  if (is_rahu_kaal) {
    avoid_for.push('starting new projects', 'signing agreements', 'making commitments', 'financial decisions');
    still_ok_for.push('completing existing work', 'review and cleanup', 'routine tasks', 'quiet preparation');
  } else if (score < 35) {
    for (const { cat } of sorted.slice(0, 2)) avoid_for.push(CATEGORY_NAMES[cat]);
    still_ok_for.push('review', 'cleanup', 'quiet planning', 'admin');
  } else if (score < 50) {
    for (const { cat, score: cs } of sorted) {
      if (cs >= 55) still_ok_for.push(CATEGORY_NAMES[cat]);
      else if (cs < 40) avoid_for.push(CATEGORY_NAMES[cat]);
    }
    if (still_ok_for.length === 0) still_ok_for.push('routine tasks', 'preparation');
  } else {
    for (const { cat, score: cs } of sorted) {
      if (cs >= 70) best_for.push(CATEGORY_NAMES[cat]);
      else if (cs >= 50) still_ok_for.push(CATEGORY_NAMES[cat]);
      else avoid_for.push(CATEGORY_NAMES[cat]);
    }
  }

  // Cap list lengths
  best_for.splice(4);
  avoid_for.splice(3);
  still_ok_for.splice(4);

  // if_unavoidable
  let if_unavoidable: string;
  if (is_rahu_kaal) {
    if_unavoidable = `If you must act during ${display_label}, finish only what is already in progress. Do not sign, commit, or initiate.`;
  } else if (score < 35) {
    if_unavoidable = `If ${display_label} cannot be avoided, keep actions minimal: review documents, organize, or do quiet prep. Delay decisions until a stronger window.`;
  } else if (score < 50) {
    const safeCats = still_ok_for.slice(0, 2).join(' or ') || 'routine tasks';
    if_unavoidable = `If you must use ${display_label}, focus on ${safeCats}. Avoid high-stakes commitments.`;
  } else {
    if_unavoidable = '';
  }

  // summary_plain
  const summary_plain = buildPlainSummary(display_label, score, is_rahu_kaal, best_for, avoid_for, still_ok_for, hora_planet, choghadiya);

  return {
    score,
    label,
    reason_tags,
    category_scores,
    best_for,
    avoid_for,
    still_ok_for,
    if_unavoidable,
    summary_plain,
  };
}

function buildPlainSummary(
  display_label: string,
  score: number,
  is_rahu_kaal: boolean,
  best_for: string[],
  avoid_for: string[],
  still_ok_for: string[],
  hora_planet: string,
  choghadiya: string,
): string {
  if (is_rahu_kaal) {
    return `${display_label} falls in Rahu Kaal. Complete existing work only. Do not start new projects, sign documents, or make financial commitments. Safe for review, cleanup, and admin.`;
  }
  if (score >= 75) {
    const bestStr = best_for.length > 0 ? best_for.join(', ') : 'focused action';
    return `${display_label} is one of the stronger windows today. ${hora_planet} hora with ${choghadiya} choghadiya supports ${bestStr}. Use this for your most important decisions and actions.`;
  }
  if (score >= 50) {
    const okStr = best_for.length > 0 ? best_for.join(', ') : (still_ok_for.length > 0 ? still_ok_for.join(', ') : 'moderate activity');
    const avoidStr = avoid_for.length > 0 ? ` Not ideal for ${avoid_for.join(' or ')}.` : '';
    return `${display_label} is moderate. ${hora_planet} hora with ${choghadiya} choghadiya supports ${okStr}.${avoidStr}`;
  }
  const safeStr = still_ok_for.length > 0 ? still_ok_for.join(', ') : 'review and preparation';
  const avoidStr = avoid_for.length > 0 ? avoid_for.join(', ') : 'high-stakes commitments';
  return `${display_label} is weak for ${avoidStr}. Better for ${safeStr}. Delay important decisions if possible.`;
}

// ── Day briefing builder ─────────────────────────────────────────────────────

export interface DayBriefingInput {
  date: string;
  day_score: number;
  panchang: Partial<PanchangData>;
  slots: Array<{
    slot_index: number;
    score: number;
    is_rahu_kaal: boolean;
    hora_planet: string;
    choghadiya: string;
    display_label: string;
    guidance?: SlotGuidanceV2;
  }>;
}

export function buildDayBriefing(input: DayBriefingInput): DayBriefingV2 {
  const { day_score, panchang, slots } = input;

  // Top windows: highest scoring non-RK slots
  const nonRkSlots = slots
    .filter((s) => !s.is_rahu_kaal)
    .sort((a, b) => b.score - a.score);

  const top_windows = nonRkSlots.slice(0, 3).map((s) => s.slot_index);
  const caution_windows = slots
    .filter((s) => s.is_rahu_kaal || s.score < 45)
    .map((s) => s.slot_index);

  // Aggregate best_for across top slots
  const catScoreAgg: Record<string, number> = {};
  for (const slot of nonRkSlots.slice(0, 5)) {
    if (slot.guidance?.category_scores) {
      for (const [cat, sc] of Object.entries(slot.guidance.category_scores)) {
        catScoreAgg[cat] = (catScoreAgg[cat] ?? 0) + sc;
      }
    }
  }

  const sortedCats = Object.entries(catScoreAgg)
    .sort(([, a], [, b]) => b - a)
    .map(([cat]) => CATEGORY_NAMES[cat as ActionCategory] ?? cat);

  const best_overall_for = sortedCats.slice(0, 3);
  const not_ideal_for = sortedCats.slice(-2);

  // Theme
  const nakshatra = panchang.nakshatra || 'mixed energy';
  const yoga = panchang.yoga || '';
  const dayRuler = panchang.day_ruler || '';
  const topHora = nonRkSlots[0]?.hora_planet || '';
  const strengthWord = day_score >= 65 ? 'strong' : day_score >= 50 ? 'moderate' : 'careful';

  const theme = `A ${strengthWord} day with ${nakshatra} nakshatra${yoga ? ` and ${yoga} yoga` : ''}${dayRuler ? `. ${dayRuler} rules.` : '.'}${topHora ? ` Best windows favor ${topHora} hora.` : ''}`;

  // why_today
  const topWindowLabels = nonRkSlots.slice(0, 3).map((s) => s.display_label).join(', ');
  const why_today = `Day score ${day_score}/100. Top windows: ${topWindowLabels || 'varies'}. ${best_overall_for.length > 0 ? `Best for ${best_overall_for.join(', ')}.` : ''} ${not_ideal_for.length > 0 ? `Less ideal for ${not_ideal_for.join(', ')}.` : ''}`.trim();

  return {
    theme,
    top_windows,
    caution_windows,
    best_overall_for,
    not_ideal_for,
    why_today,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function ordinalSuffix(n: number): string {
  if (n >= 11 && n <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}
