/**
 * Reads `reports.personal_context` back into a SeekerProfile.
 *
 * The note is written by `personalContextFrom` / `funnelPersonalContext`
 * (src/lib/quiz/personalContext.ts) from the option labels a person tapped, so every
 * value can be mapped back through the same label tables. A round-trip test asserts that
 * for every answer; anything unrecognised is simply ignored, never guessed.
 */

import { STEPS } from '@/lib/quiz/questions';
import { DETAIL_FIELDS } from '@/lib/quiz/personalContext';
import { QUIZ_SLUGS, DEFAULT_SLUG } from '@/config/quiz_slugs';
import { buildScreens } from '@/lib/funnel/screens';
import {
  emptyProfile,
  type Area,
  type Duration,
  type Frustration,
  type Goal,
  type Granularity,
  type PartnerKnown,
  type Prior,
  type Role,
  type SeekerProfile,
  type TimeConfidence,
} from './profile';

type Option = { value: string; label: string };

function startOptions(field: string): Option[] {
  for (const s of STEPS) {
    if ((s.kind === 'single' || s.kind === 'multi') && s.field === field) return s.options.map((o) => ({ value: o.value, label: o.label }));
  }
  return [];
}

function funnelOptions(field: string): Option[] {
  const screens = buildScreens(QUIZ_SLUGS[DEFAULT_SLUG]);
  for (const s of screens) {
    if ((s.kind === 'single' || s.kind === 'picture') && s.field === field) return s.options.map((o) => ({ value: o.value, label: o.label.en }));
  }
  return [];
}

function byLabel(options: Option[], label: string, lower = false): string | null {
  const want = lower ? label.trim().toLowerCase() : label.trim();
  const hit = options.find((o) => (lower ? o.label.toLowerCase() : o.label) === want);
  return hit ? hit.value : null;
}

/** Sentence openers, as written by personalContext.ts. Longest first so none shadows another. */
const OPENERS = [
  'What is weighing on me most: ',
  'More specifically: ',
  'Birth time: ',
  'On my mind for: ',
  'Coming up: ',
  'A decision is coming up soon.',
  'The person involved is ',
  'Their birth details: ',
  'Consulted an astrologer before: ',
  'What has bothered me about astrology: ',
  'Most useful to me: ',
  'Earlier I asked: "',
  'Where it repeats most: ',
  'Felt I knew someone before meeting them: ',
  'A place felt like home for no reason: ',
  'Which sounds most like me: ',
  'What matters most in the next 12 months: ',
  'My own picks, to compare with my chart but not to read it from: ',
].sort((a, b) => b.length - a.length);

const ESC = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// "Asked "<the slug's S01 question>", I answered: " has a variable middle, so it has its own pattern.
const OPENER_RE = new RegExp(`(?:${OPENERS.map(ESC).join('|')}|Asked "[^"]*", I answered: )`, 'g');

interface Sentence {
  opener: string;
  value: string;
}

function sentencesOf(text: string): Sentence[] {
  const marks: { at: number; opener: string }[] = [];
  OPENER_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = OPENER_RE.exec(text))) marks.push({ at: m.index, opener: m[0] });
  const out: Sentence[] = [];
  marks.forEach((mk, i) => {
    const end = i + 1 < marks.length ? marks[i + 1].at : text.length;
    let value = text.slice(mk.at + mk.opener.length, end).trim();
    // Every sentence ends with a full stop (or a closing quote and a stop for a typed question).
    if (mk.opener.startsWith('Earlier I asked')) value = value.replace(/"\.?$/, '');
    else value = value.replace(/\.$/, '');
    out.push({ opener: mk.opener, value });
  });
  return out;
}

const CONCERN_AREA: Record<string, Area> = {
  career: 'career',
  marriage: 'love',
  children: 'family',
  health: 'health',
  business: 'business',
  curious: 'curious',
};

const FOCUS_AREAS = new Set(['career', 'love', 'family', 'health', 'trust']);

export function parseSeekerProfile(text: string | null | undefined): SeekerProfile {
  const p = emptyProfile();
  const raw = typeof text === 'string' ? text : '';
  if (!raw.trim()) return p;

  const concernOpts = startOptions('concern');
  const durationOpts = startOptions('duration');
  const priorOpts = startOptions('prior');
  const frustrationOpts = startOptions('frustration');
  const granularityOpts = startOptions('granularity');
  const partnerKnownOpts = startOptions('partner_known');
  const detailOpts = DETAIL_FIELDS.flatMap((f) => startOptions(f));

  for (const s of sentencesOf(raw)) {
    const v = s.value;
    const asked = s.opener.match(/^Asked "([^"]*)", I answered: $/);
    if (asked) {
      p.origin = 'funnel';
      p.hookAnswer = byLabel(funnelOptions('hook'), v);
      p.labels.hook = v;
      p.labels.hook_question = asked[1];
      continue;
    }
    switch (s.opener) {
      case 'What is weighing on me most: ': {
        const c = byLabel(concernOpts, v);
        if (c) {
          p.origin = 'start';
          p.concern = c as SeekerProfile['concern'];
          p.area = CONCERN_AREA[c] ?? null;
          p.labels.concern = v;
        }
        break;
      }
      case 'More specifically: ': {
        const d = byLabel(detailOpts, v);
        if (d) {
          p.detail = d;
          p.labels.detail = v;
        }
        break;
      }
      case 'Birth time: ': {
        const t: TimeConfidence | null = v.startsWith('known exactly') ? 'exact' : v.startsWith('approximate') ? 'approx' : v.startsWith('not known') ? 'unknown' : null;
        if (t) p.timeConfidence = t;
        break;
      }
      case 'On my mind for: ': {
        const d = byLabel(durationOpts, v, true);
        if (d) {
          p.duration = d as Duration;
          p.labels.duration = durationOpts.find((o) => o.value === d)?.label ?? v;
        }
        break;
      }
      case 'Coming up: ':
        if (v) {
          p.hasEvent = 'yes';
          p.eventText = v.slice(0, 200);
        }
        break;
      case 'A decision is coming up soon.':
        p.hasEvent = 'soon';
        break;
      case 'The person involved is ':
        if (v) p.partnerName = v.slice(0, 60);
        break;
      case 'Their birth details: ': {
        const k = byLabel(partnerKnownOpts, v);
        if (k) {
          p.partnerKnown = k as PartnerKnown;
          p.labels.partner_known = v;
        }
        break;
      }
      case 'Consulted an astrologer before: ': {
        const pr = byLabel(priorOpts, v);
        if (pr) {
          p.prior = pr as Prior;
          p.labels.prior = v;
        }
        break;
      }
      case 'What has bothered me about astrology: ': {
        if (v.startsWith('nothing')) {
          p.frustrations = ['nothing'];
        } else {
          const picked: Frustration[] = [];
          for (const part of v.split(/;\s*/)) {
            const f = byLabel(frustrationOpts, part);
            if (f) picked.push(f as Frustration);
          }
          p.frustrations = picked;
          p.labels.frustration = v;
        }
        break;
      }
      case 'Most useful to me: ': {
        const g = byLabel(granularityOpts, v, true);
        if (g) {
          p.granularity = g as Granularity;
          p.labels.granularity = granularityOpts.find((o) => o.value === g)?.label ?? v;
        }
        break;
      }
      case 'Earlier I asked: "':
        if (v) p.priorQuestion = v.slice(0, 300);
        break;

      // ── /q funnel ──
      case 'Where it repeats most: ': {
        const a = byLabel(funnelOptions('focus_area'), v);
        if (a && FOCUS_AREAS.has(a)) {
          p.origin = 'funnel';
          p.area = a as Area;
          p.labels.focus_area = v;
        }
        break;
      }
      case 'Felt I knew someone before meeting them: ':
        p.knownBefore = byLabel(funnelOptions('known_before'), v);
        break;
      case 'A place felt like home for no reason: ':
        p.placeHome = byLabel(funnelOptions('place_home'), v);
        break;
      case 'Which sounds most like me: ':
        p.skillsFears = byLabel(funnelOptions('skills_fears'), v);
        break;
      case 'What matters most in the next 12 months: ': {
        const g = byLabel(funnelOptions('goal_12m'), v);
        if (g) {
          p.goal = g as Goal;
          p.labels.goal_12m = v;
        }
        break;
      }
      case 'My own picks, to compare with my chart but not to read it from: ': {
        const roleOpts = funnelOptions('self_role');
        const picOpts = funnelOptions('picture');
        for (const part of v.split(/;\s*/)) {
          if (part.startsWith('role that feels familiar: ')) {
            const r = byLabel(roleOpts, part.slice('role that feels familiar: '.length));
            if (r) {
              p.selfRole = r as Role;
              p.labels.self_role = part.slice('role that feels familiar: '.length);
            }
          } else if (part.startsWith('image that pulled me first: ')) {
            p.picture = byLabel(picOpts, part.slice('image that pulled me first: '.length));
          }
        }
        break;
      }
    }
  }

  // The funnel's goal also says what the area is when no concern was asked.
  if (p.origin === 'funnel' && p.area === null && p.goal) {
    p.area = p.goal === 'career_move' || p.goal === 'money' ? 'career' : p.goal === 'relationship' ? 'love' : p.goal === 'business' ? 'business' : null;
  }
  return p;
}
