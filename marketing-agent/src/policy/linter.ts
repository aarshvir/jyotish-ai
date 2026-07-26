import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from '../db/index';
import { brain } from '../brain/index';

export type Verdict = 'pass' | 'flag' | 'block';

export interface LintResult {
  verdict: Verdict;
  reason: string;
  deterministic: Verdict;
  classifier: { verdict: Verdict; reason: string } | null;
}

interface BannedClaims {
  block: string[];
  flag: string[];
  /** AD COPY ONLY — engine/technical terms the owner ruled meaningless to a viewer. */
  jargon?: string[];
  categories: Record<string, string[]>;
}

function loadClaims(): BannedClaims {
  return JSON.parse(readFileSync(resolve(ROOT, 'config', 'banned-claims.json'), 'utf8'));
}

const sev: Record<Verdict, number> = { pass: 0, flag: 1, block: 2 };
const worse = (a: Verdict, b: Verdict): Verdict => (sev[a] >= sev[b] ? a : b);

/**
 * Jargon terms present in `text`. Exported because the creative engine scores against the same
 * list (it penalises `credibility` and hard-rejects the variant), and both must agree.
 *
 * Owner ruling 2026-07-26: "some jargon like Swiss Ephemeris, Lahiri... No one gives a shit. I
 * don't even know what this is." Ad copy only — the blog and site may use these freely.
 */
export function jargonHits(text: string): string[] {
  const t = (text ?? '').toLowerCase();
  const list = loadClaims().jargon ?? [];
  return list.filter((w) => t.includes(w.toLowerCase()));
}

function deterministic(text: string, claims: BannedClaims, context: 'organic' | 'ad'): { verdict: Verdict; reason: string } {
  const t = text.toLowerCase();
  const hitBlock = claims.block.find((w) => t.includes(w.toLowerCase()));
  if (hitBlock) return { verdict: 'block', reason: `banned phrase: "${hitBlock}"` };
  const hitFlag = claims.flag.find((w) => t.includes(w.toLowerCase()));
  if (hitFlag) return { verdict: 'flag', reason: `sensitive phrase: "${hitFlag}"` };
  // FLAG, never block: jargon is a quality defect, not a policy violation, and it is legal
  // everywhere except paid/ad copy.
  if (context === 'ad') {
    const hitJargon = (claims.jargon ?? []).find((w) => t.includes(w.toLowerCase()));
    if (hitJargon) return { verdict: 'flag', reason: `ad-copy jargon: "${hitJargon}" — say "real astronomical data" instead` };
  }
  return { verdict: 'pass', reason: 'no banned/sensitive phrases' };
}

function classifierPrompt(text: string, context: 'organic' | 'ad'): string {
  return `You are the strict brand & advertising policy linter for VedicHour, a Vedic astrology TIMING app. VedicHour sells timing AWARENESS and calm reflection — NEVER certainty, luck, or outcomes. Judge ONLY the text between <<< >>>.

BLOCK (never publish) if it contains any of:
- guarantees / certainty: "guaranteed", "will definitely", "100% accurate", "predict exactly", "know your future for certain"
- luck framing: good luck / bad luck / lucky or unlucky hour
- outcome promises: fix your life, change your destiny or fate, become rich, get the job, pass the exam, win, save your marriage
- "best hour" or "worst hour" — VedicHour ALWAYS says "clearer" / "heavier" windows, never best/worst
- medical / legal / financial / relationship claims; cure / heal / treat; fear or doom (avoid disaster, curse)${context === 'ad' ? `
- (THIS IS A PAID AD) asserting or implying a PERSONAL ATTRIBUTE or personal hardship of the viewer — their health, finances, relationship trouble, faith, or emotional state. Meta bans this outright. Examples that BLOCK: "struggling in your marriage?", "feeling lost?", "money problems?", "are you cursed?", "why you keep failing".
  CALIBRATION — this rule is about claims made ABOUT THE VIEWER, not about ordinary life admin. An everyday, universal situation is CONTEXT and must PASS: "a meeting on Monday", "an interview slot to pick", "a call you keep putting off", "an exam next week", "waiting on a reply". Naming a scheduling decision is not implying pain, and this product exists precisely to help people time such decisions — if a time-sensitive choice counted as hardship, nothing about it could ever be advertised. Only block when the copy diagnoses the VIEWER (their marriage is failing, their life is stuck, they are unlucky), not when it simply names a moment anyone might have.` : ''}

CALIBRATION — READ CAREFULLY: VedicHour's ENTIRE product is timing AWARENESS. Describing the general nature of a planetary hour, dosha, or period — e.g. "the Jupiter hora leans toward growth", "the Mercury hora is a clearer window for conversations", "Saturn's lessons", "Manglik often cancels out" — is the CORE, ON-BRAND product and MUST PASS. That is NOT a banned outcome promise. Educational, reflective, reassuring, plain-English content PASSES. Do not flag merely because content describes what a window/period generally favours, or discusses a dosha calmly. The exact brand taglines "Your Life, Decoded Hour by Hour." and "Not another horoscope — a personal Vedic timing grid." are APPROVED brand lines — never flag or block content for using them.

FLAG (escalate) ONLY if: it promises a SPECIFIC personal result the reader will get ("you'll land the raise"), the tone is spooky / hypey / guru-like / fear-based, or you are genuinely unsure it's on-brand.

PASS (the default for calm, on-brand copy): plain-English timing/reflection content that avoids the BLOCK list above. A differentiator (18 horas, real astronomical data, plain English) is a plus but not required to pass.${context === 'ad' ? '\n(THIS IS A PAID AD) Engine jargon — Swiss Ephemeris, Lahiri, ayanamsa, sidereal, whole-sign, vimshottari — does not belong in ad copy; a deterministic list already flags it, so do not also block for it.' : ''}

Respond with ONE LINE of strict JSON and nothing else:
{"verdict":"pass|flag|block","reason":"<=14 words"}

<<<
${text}
>>>`;
}

function parseVerdict(raw: string): { verdict: Verdict; reason: string } | null {
  const m = raw.match(/\{[\s\S]*?\}/);
  if (!m) return null;
  try {
    const j = JSON.parse(m[0]);
    const v = String(j.verdict).toLowerCase();
    if (v === 'pass' || v === 'flag' || v === 'block') {
      return { verdict: v as Verdict, reason: String(j.reason ?? '').slice(0, 120) };
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Policy-linter: pass | flag | block. Deterministic word-list first (a block
 * phrase short-circuits), then the brain() classifier for nuance against the
 * VedicHour voice spec. The more severe verdict wins; classifier failure falls
 * back to the deterministic result.
 */
export async function lint(
  text: string,
  opts: { classify?: boolean; context?: 'organic' | 'ad' } = {},
): Promise<LintResult> {
  const claims = loadClaims();
  const det = deterministic(text, claims, opts.context ?? 'organic');

  if (det.verdict === 'block' || opts.classify === false) {
    return { verdict: det.verdict, reason: det.reason, deterministic: det.verdict, classifier: null };
  }

  let classifier: { verdict: Verdict; reason: string } | null = null;
  try {
    const res = await brain(classifierPrompt(text, opts.context ?? 'organic'), { tier: 'bulk', loop: 'policy-linter' });
    classifier = parseVerdict(res.text);
  } catch {
    classifier = null;
  }

  const verdict = classifier ? worse(det.verdict, classifier.verdict) : det.verdict;
  const reason =
    classifier && sev[classifier.verdict] >= sev[det.verdict] ? classifier.reason : det.reason;
  return { verdict, reason, deterministic: det.verdict, classifier };
}
