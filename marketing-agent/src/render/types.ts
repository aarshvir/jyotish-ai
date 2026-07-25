/**
 * The contract between the CREATIVE engine (writes output/creative/<slug>.json) and this
 * RENDER pipeline (reads it). The creative engine owns what is said; render owns how it looks.
 *
 * House rule, from the owner and backed by platform behaviour: Instagram deprioritises pure
 * AI-generated content with no visible human layer, but AI-ASSISTED content with a visible
 * presenter performs normally. So every reel MUST open on a `presenter` shot. `validateCreative()`
 * enforces that — a creative without a presenter opener is rejected, not silently rendered.
 */

/** Which generator a shot is routed to. `screencap` and `placeholder` are free. */
export type ShotProvider = 'veo31_fast' | 'kling30' | 'wan26' | 'wan27' | 'seedance2_fast' | 'screencap' | 'placeholder';

export type ShotRole =
  | 'presenter' // photoreal human speaking to camera, lip-synced. Veo 3.1 Fast (native audio).
  | 'broll_hero' // the one cinematic beauty shot. Kling.
  | 'broll' // filler motion. Wan (cheapest).
  | 'product' // real VedicHour UI. screencap — free, and the honest proof shot.
  | 'presenter_close'; // presenter returns for the CTA. Veo 3.1 Fast.

export interface Shot {
  /** Stable id within the reel — used for cache filenames and spend rows. */
  id: string;
  role: ShotRole;
  seconds: number;
  /** Visual description sent to the video model. Ignored for `product` shots. */
  prompt?: string;
  /**
   * PRESENTER SHOTS ONLY. The exact line the human says, in ROMAN/LATIN-script Hinglish.
   * Devanagari and other non-Latin scripts are rejected or produce glitched mouth shapes,
   * so `validateCreative()` hard-fails on non-Latin characters here.
   */
  dialogue?: string;
  /** Non-presenter shots: narration laid over this shot (edge-tts / ElevenLabs). */
  vo?: string;
  /** `product` shots: which page to capture and how. */
  capture?: { url: string; waitForSelector?: string; scrollPx?: number };
  /** Override the default provider routing for this role. */
  provider?: ShotProvider;
  /** Optional reference image (data URL or https) for image-to-video subject consistency. */
  imageUrl?: string;
}

export interface CreativeScript {
  slug: string;
  title: string;
  /** forecast | kundali | matchmaking — decides the landing page in PUBLISH.md. */
  product: string;
  /** Only `ready_to_render` is picked up by the loop. */
  status: 'draft' | 'ready_to_render' | 'rendered' | 'blocked';
  /** Creative-engine ranking; the loop renders the highest first. */
  rank?: number;
  /** Big on-screen hook, held over the opening presenter shot. Keep it under ~40 chars. */
  hook: string;
  /** On-screen closing line. */
  cta: string;
  /** edge-tts voice for non-presenter narration. */
  voice?: string;
  shots: Shot[];
  /** Optional overrides for the generated PUBLISH.md. */
  publish?: {
    youtubeTitle?: string;
    description?: string;
    tags?: string[];
    hashtags?: string[];
    caption?: string;
  };
}

/** Characters allowed in presenter dialogue: Latin letters, digits, spaces, common punctuation. */
const LATIN_ONLY = /^[\x20-\x7EÀ-ɏ‘’“”–—…]*$/;

export interface ValidationIssue {
  level: 'error' | 'warn';
  where: string;
  message: string;
}

/** Structural + house-rule validation. Returns every problem, not just the first. */
export function validateCreative(c: any): { ok: boolean; issues: ValidationIssue[]; creative: CreativeScript | null } {
  const issues: ValidationIssue[] = [];
  const err = (where: string, message: string) => issues.push({ level: 'error', where, message });
  const warn = (where: string, message: string) => issues.push({ level: 'warn', where, message });

  if (!c || typeof c !== 'object') {
    return { ok: false, issues: [{ level: 'error', where: 'root', message: 'not an object' }], creative: null };
  }
  for (const f of ['slug', 'title', 'hook', 'cta'] as const) {
    if (!c[f] || typeof c[f] !== 'string') err(f, 'missing or not a string');
  }
  if (!Array.isArray(c.shots) || c.shots.length === 0) {
    err('shots', 'missing or empty');
    return { ok: false, issues, creative: null };
  }

  const seen = new Set<string>();
  c.shots.forEach((s: any, i: number) => {
    const w = `shots[${i}]`;
    if (!s.id || typeof s.id !== 'string') err(w, 'missing id');
    else if (seen.has(s.id)) err(w, `duplicate shot id "${s.id}"`);
    else seen.add(s.id);
    if (!s.role) err(w, 'missing role');
    if (!Number.isFinite(s.seconds) || s.seconds <= 0) err(w, 'seconds must be a positive number');
    else if (s.seconds > 12) warn(w, `${s.seconds}s is longer than any single model reliably generates; it will be split or clamped`);

    const isPresenter = s.role === 'presenter' || s.role === 'presenter_close';
    if (isPresenter) {
      if (!s.dialogue || !String(s.dialogue).trim()) err(w, 'presenter shot has no dialogue');
      else if (!LATIN_ONLY.test(s.dialogue))
        err(w, 'dialogue must be ROMAN/LATIN-script Hinglish — non-Latin script is rejected or glitches lip-sync');
      if (!s.prompt) warn(w, 'no prompt — the presenter look/framing will be whatever the model defaults to');
    } else if (s.role === 'product') {
      if (!s.capture?.url) err(w, 'product shot needs capture.url');
    } else if (!s.prompt) {
      err(w, `${s.role} shot needs a prompt`);
    }
  });

  // House rule: a visible human must open the reel.
  if (c.shots[0]?.role !== 'presenter') {
    err('shots[0]', 'reel must OPEN on a `presenter` shot — faceless/slideshow reels are rejected by policy');
  }

  const total = c.shots.reduce((a: number, s: any) => a + (Number(s.seconds) || 0), 0);
  if (total > 90) warn('shots', `${total}s total — short-form ranks best under ~45s`);
  if (total < 8) warn('shots', `${total}s total — too short to land a hook + proof + CTA`);

  const ok = !issues.some((i) => i.level === 'error');
  return { ok, issues, creative: ok ? (c as CreativeScript) : null };
}
