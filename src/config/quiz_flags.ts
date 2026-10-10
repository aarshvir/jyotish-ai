/**
 * Experiment flags for the /q funnel (VEDICHOUR_QUIZ_SPEC §9). Config, not code: change
 * an arm's weight here to run or stop a test. One flag change at a time per slug, and at
 * least 300 reveal views per arm before reading a result.
 *
 * Assignment is deterministic per funnel session (hash of session id + flag name), so a
 * refresh never moves someone to another arm.
 */

export interface FlagArm<V extends string> {
  value: V;
  /** Relative weight. 0 = arm defined but switched off. */
  weight: number;
}

export interface FlagDef<V extends string> {
  name: string;
  arms: FlagArm<V>[];
}

/** E1 — quiz length. 'short' drops S03, S04, S05, S07 and S09. */
export const FLAG_QUIZ_LENGTH: FlagDef<'full' | 'short'> = {
  name: 'quiz_length',
  arms: [
    { value: 'full', weight: 1 },
    { value: 'short', weight: 0 },
  ],
};

/** E2 — is the contact step required ('A') or skippable ('B')? */
export const FLAG_CONTACT_REQUIRED: FlagDef<'A' | 'B'> = {
  name: 'contact_required',
  arms: [
    { value: 'A', weight: 1 },
    { value: 'B', weight: 1 },
  ],
};

/**
 * E3 — report price arms (INR). Only the ₹199 control has a checkout plan today
 * (`blueprint` in ZIINA_PLANS); the other arms stay at weight 0 until the Pricing owner
 * adds their plans, so a visitor can never be shown a price checkout would not charge.
 */
export const FLAG_PRICE_REPORT: FlagDef<'149' | '199' | '299'> = {
  name: 'price_report',
  arms: [
    { value: '149', weight: 0 },
    { value: '199', weight: 1 },
    { value: '299', weight: 0 },
  ],
};

/** E5 — reveal mode. Timing reveal not built yet; see revealModeFor in quiz_slugs.ts. */
export const FLAG_REVEAL_MODE: FlagDef<'karmic' | 'timing'> = {
  name: 'reveal_mode',
  arms: [
    { value: 'karmic', weight: 1 },
    { value: 'timing', weight: 0 },
  ],
};

/** FNV-1a 32-bit — small, stable, dependency-free. */
export function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function assignArm<V extends string>(flag: FlagDef<V>, sessionId: string): V {
  const live = flag.arms.filter((a) => a.weight > 0);
  if (live.length === 0) return flag.arms[0].value;
  const total = live.reduce((n, a) => n + a.weight, 0);
  let point = (hash32(`${flag.name}:${sessionId}`) / 0x100000000) * total;
  for (const a of live) {
    if (point < a.weight) return a.value;
    point -= a.weight;
  }
  return live[live.length - 1].value;
}
