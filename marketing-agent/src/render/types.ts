import { FORBIDDEN_CAPTURE } from './capture-policy';
import { AD_VO_VOICE, NATIVE_VOICE, APPROVED_AD_VOICES } from './sarvam';

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
  /**
   * Non-presenter shots: SHORT connective narration laid over this shot, synthesized with the
   * one approved ad voice. Owner law + CLAUDE.md §2: the presenter carries the message on camera
   * (Veo native audio is free AND the quality bar), so this is <= NARRATION_MAX_WORDS words or
   * nothing at all.
   */
  vo?: string;
  /**
   * EXPLICIT VOICE ID for this shot's audio — `veo_native` when the video model performs the
   * line in-shot, otherwise the Sarvam speaker id. Written by the creative engine so the $0
   * pre-flight gate can inspect the voice plan without re-deriving it from roles.
   */
  voice?: string;
  /** `product` shots: which page to capture and how. `panToPx` is the page-Y where the pan
   *  STOPS (default: page bottom); `panToPx: 0` with a `scrollPx` start pans back UP and ends
   *  cleanly on the hero instead of mid-scroll footer. `libraryKey` names the resolved
   *  config/creative-seeds.json screencapTarget, so a reviewer can see WHAT was meant. */
  capture?: { url: string; libraryKey?: string; waitForSelector?: string; scrollPx?: number; panToPx?: number };
  /**
   * THE L-CUT. Presenter shots only.
   *
   * The last `audioExtendsSec` seconds of this presenter's own in-shot Veo take keep playing
   * underneath the NEXT shot's picture. His picture leaves that much earlier; his voice does not.
   * The product screen therefore arrives INSIDE his sentence instead of after it.
   *
   * MEASURED AGAINST WHERE HE STOPS TALKING, NOT AGAINST `seconds`. Veo bills whole seconds and
   * routinely finishes the line early — an 8s take measured on 2026-08-19 stopped at 7.15s — so
   * the renderer runs a silence detector over the delivered clip and puts the picture cut
   * `audioExtendsSec` before the LAST WORD. The carried tail is then all speech, and the take's
   * dead tail is discarded rather than screened. See lastSpeechEndSec() in ./assemble.ts.
   *
   * WHY THIS EXISTS. The taste lens (src/audit/human-eye.ts) asked for exactly this ~21 times
   * across every batch this engine has run, and on 2026-08-19 all six variants of the best round
   * died at the same 13.0s mark asking for it in these words: "Show Thursday 7:30 emerging clearly
   * while he continues talking over the screen", "Overlay the screen briefly during his sentence",
   * "without leaving his face", "the silent product insert breaks the tension instead of resolving
   * it". Shortening the hold was tried at 6s, 4s and 2-3s; the lens flagged all three, always at
   * the same second, because duration was never the complaint. Every product beat was a HARD
   * SILENCE — the renderer composed audio strictly per clip and had no carry-over at all.
   *
   * IT DOES NOT TOUCH THE VOICE LAW (CLAUDE.md §2). There is no TTS here and no second narrator:
   * it is the same man's same free Veo take, still playing, while the picture is elsewhere. That
   * is why the receiving shot must be SILENT — an L-cut over a shot that has its own `vo` would be
   * two voices at once, which is the defect the owner rejected.
   *
   * WHY THE NUMBER LIVES ON THE SPEAKER, not as `audioFrom` on the receiver: `seconds` is what the
   * line was written to fill, so at `seconds - audioExtendsSec` he is demonstrably still talking.
   * A receiver-side pointer would let two shots disagree, or point somewhere the renderer cannot
   * reach; one number on the shot that owns the voice cannot be inconsistent with itself.
   *
   * The reel gets SHORTER by this many seconds, and quieter for fewer of them — an L-cut always
   * improves the dead-air numbers in src/render/listen.ts, it never needs an exemption from them.
   */
  audioExtendsSec?: number;
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
  /**
   * The ONE synthesized narration voice for the whole reel (Sarvam Bulbul v3 speaker id).
   * Legacy creatives carry an edge-tts name here; the render loop ignores those and warns.
   */
  voice?: string;
  shots: Shot[];
  /**
   * Machine-readable voice plan, emitted by the creative engine for the $0 pre-flight gate.
   * `nativeShots` speak with the video model's own audio; `narratedShots` are the only shots
   * that cost TTS, and they all use `adVoice`.
   */
  voicePlan?: {
    adVoice: string;
    nativeShots: string[];
    narratedShots: string[];
    /** Longest narration line, in words — pre-flight compares it to seconds x 2.3. */
    maxNarrationWords: number;
  };
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

/**
 * Spoken Hinglish runs about 2.3 words/second. A line longer than its shot is CUT mid-sentence
 * by the renderer, which is exactly the kind of defect CLAUDE.md §1 says must be caught for $0
 * on the INPUT, not discovered in $3 of rendered pixels.
 */
export const WORDS_PER_SECOND = 2.3;

/**
 * Hard cap on narration over a NON-presenter shot. The message belongs in the presenter's
 * on-camera dialogue (free, lip-synced, and the quality bar the owner praised); b-roll and
 * product shots get a short connective line or silence + captions.
 */
export const NARRATION_MAX_WORDS = 12;

// ---------------------------------------------------------------------------------------------
// L-CUT LIMITS — see Shot.audioExtendsSec
// ---------------------------------------------------------------------------------------------

/**
 * Longest a presenter's voice may run over the following picture. Three seconds is the product
 * HOLD's own ceiling (PRODUCT_HOLD_MAX_SEC in src/loops/creative.ts), so this allows an L-cut
 * across the whole hold and nothing beyond it — the renderer only ever carries audio into the
 * IMMEDIATELY next shot, and a longer tail would be silently truncated rather than heard.
 */
export const LCUT_MAX_SEC = 3;

/**
 * Picture a presenter shot must keep after the cut. Below about a second and a bit the beat stops
 * being a shot and becomes a flash frame — the viewer registers a cut, not a face.
 */
export const LCUT_MIN_PICTURE_SEC = 1.2;

/** Veo takes start speaking about here. Same figure nativeVo() uses to place the first caption. */
export const LCUT_SPEECH_LEAD_SEC = 0.3;

/**
 * How much speech must still be left when the picture leaves. An L-cut whose audio tail is the
 * presenter having already finished is not an L-cut, it is the same silence one shot earlier —
 * and it would read to the taste lens exactly as the thing it has been rejecting.
 */
export const LCUT_MIN_SPEECH_MARGIN_SEC = 0.2;



/**
 * THE SITE NAME, AS A LISTENER MUST HEAR IT.
 *
 * OWNER LAW (2026-07-26, verbatim): "at the end there should be a call to action: Try
 * VedicHour.com... because people who are listening to the reel will figure out, Oh, I found this
 * new platform, VedicHour."
 *
 * A reel is consumed with the thumb, often with the eyes half-elsewhere — an on-screen-only CTA
 * reaches nobody who is LISTENING. So the closing presenter shot has to say the name out loud, in
 * his own on-camera dialogue: Veo performs it, which makes it free, single-voiced and lip-synced.
 * Asserted for $0 twice before any spend — in the creative engine's own reject gate and again in
 * the render pre-flight (src/loops/render.ts).
 *
 * WHAT MUST BE SPOKEN IS THE NAME, NOT THE URL (amended 2026-08-18). The owner's INTENT is the
 * sentence above: a listener has to come away knowing the platform is called VedicHour. His example
 * happened to include ".com" because that is how he types the address — but reading a web address
 * out loud is the single thing the taste lens names as ad-speak, and the branded end card already
 * carries the full vedichour.com in writing, which is where an address belongs. So "VedicHour pe
 * dekh liya" satisfies the law completely and is the preferred form.
 *
 * The pattern is therefore deliberately loose about the space AND about the .com: "VedicHour pe
 * dekh liya", "Vedic Hour kholi thi", "VedicHour.com pe dekh lo" and "vedichour dot com" all pass,
 * because all four put the brand name in the listener's ear. Saying ".com" is not a failure — it is
 * simply no longer required, and the script prompts now steer away from it.
 */
export const SPOKEN_SITE = /vedic\s*hour/i;

const wordCount = (s: string | undefined): number => (s ?? '').trim().split(/\s+/).filter(Boolean).length;

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
      if (s.vo?.trim()) err(w, 'presenter shot must not carry `vo` — its voice is the model\'s own in-shot performance, never overdubbed');
    } else if (s.role === 'product') {
      if (!s.capture?.url) err(w, 'product shot needs capture.url');
      else if (FORBIDDEN_CAPTURE.test(s.capture.url))
        err(w, `capture.url "${s.capture.url}" is a pricing/checkout/payment/onboarding page — product shots show the REPORT and its hour-slots (owner law 2026-07-26)`);
    } else if (!s.prompt) {
      err(w, `${s.role} shot needs a prompt`);
    }

    // ---- voice plan (CLAUDE.md §1: pre-flight hard-blocks, never warns) --------------------
    const declared = typeof s.voice === 'string' && s.voice.trim() ? s.voice.trim() : null;
    if (declared) {
      if (isPresenter && declared !== NATIVE_VOICE)
        err(w, `presenter shot declares voice "${declared}" — a presenter speaks with ${NATIVE_VOICE} (the model's own audio)`);
      else if (!isPresenter && s.vo?.trim() && declared !== AD_VO_VOICE)
        err(w, `narrated shot declares voice "${declared}" — the only approved ad narration voice is "${AD_VO_VOICE}"`);
      else if (!(APPROVED_AD_VOICES as readonly string[]).includes(declared))
        err(w, `voice "${declared}" is not on the approved list (${APPROVED_AD_VOICES.join(', ')})`);
      if (/neerja|edge-tts|Neural$/i.test(declared))
        err(w, `voice "${declared}" is an edge-tts voice — the owner rejected it as sounding AI-generated`);
    }

    // ---- the L-cut ---------------------------------------------------------------------------
    // Hard blocks, never warnings (CLAUDE.md §1): every one of these is decidable from the JSON,
    // and every one of them would otherwise be discovered in rendered pixels that cost money.
    if (s.audioExtendsSec !== undefined && s.audioExtendsSec !== null) {
      const e = Number(s.audioExtendsSec);
      const next = c.shots[i + 1];
      if (!isPresenter) {
        err(w, `only a presenter shot may declare audioExtendsSec — a ${s.role} shot has no voice of its own to carry`);
      } else if (!Number.isFinite(e) || e <= 0) {
        err(w, 'audioExtendsSec must be a positive number of seconds');
      } else if (e > LCUT_MAX_SEC) {
        err(w, `audioExtendsSec ${e}s exceeds the ${LCUT_MAX_SEC}s ceiling — the renderer carries audio into the NEXT shot only, so a longer tail would be cut, not heard`);
      } else if (!next) {
        err(w, 'audioExtendsSec on the LAST shot — there is nothing after it for the voice to play over');
      } else if (next.role === 'presenter' || next.role === 'presenter_close') {
        err(w, `audioExtendsSec carries this voice over shot "${next.id}", which is another presenter — his lips would be moving to someone else's words. An L-cut runs over a product or b-roll shot`);
      } else if (String(next.vo ?? '').trim()) {
        err(w, `audioExtendsSec carries this voice over shot "${next.id}", which has its own narration ("${String(next.vo).trim().slice(0, 40)}") — two voices at once is the exact defect the owner rejected. The receiving shot must be silent`);
      } else if (e > Number(next.seconds)) {
        err(w, `audioExtendsSec ${e}s is longer than the following shot "${next.id}" (${next.seconds}s) — the voice would be cut at the shot boundary`);
      } else {
        // The renderer anchors the picture cut on the WAVEFORM — `audioExtendsSec` seconds before
        // he actually stops talking — so these two checks are about the LINE, not the clip: is
        // there a tail to carry, and is there a shot left in front of it? Same words-per-second
        // model the narration-fit check below already trusts.
        const speechSec = wordCount(s.dialogue) / WORDS_PER_SECOND;
        const pictureEst = LCUT_SPEECH_LEAD_SEC + speechSec - e;
        if (speechSec < e + LCUT_MIN_SPEECH_MARGIN_SEC)
          err(
            w,
            `an L-cut of ${e}s would carry the WHOLE line: "${String(s.dialogue ?? '').slice(0, 40)}" is about ${speechSec.toFixed(1)}s of speech. ` +
              'An L-cut carries the TAIL of a sentence over the next picture — if it starts before he does, the shot has no on-camera line left in it. Shorten audioExtendsSec.',
          );
        else if (pictureEst < LCUT_MIN_PICTURE_SEC)
          err(
            w,
            `an L-cut of ${e}s would leave about ${pictureEst.toFixed(1)}s of picture on a ${s.seconds}s shot — below ${LCUT_MIN_PICTURE_SEC}s it is a flash frame, not a beat. ` +
              'Shorten the L-cut, or give him more to say before the screen takes over.',
          );
      }
    }

    // ---- narration fit + connective-line cap ------------------------------------------------
    const spoken = isPresenter ? s.dialogue : s.vo;
    const n = wordCount(spoken);
    const budget = Math.floor((Number(s.seconds) || 0) * WORDS_PER_SECOND);
    if (n > budget)
      err(w, `${n} spoken words in a ${s.seconds}s shot (budget ${budget} at ${WORDS_PER_SECOND} words/s) — the renderer would cut the line mid-sentence`);
    if (!isPresenter && n > NARRATION_MAX_WORDS)
      err(w, `${n}-word narration over a ${s.role} shot — non-presenter narration is capped at ${NARRATION_MAX_WORDS} words; move this line into presenter dialogue`);
  });

  // One reel, one narrator. Veo native + ONE matched TTS voice is the approved plan; two TTS
  // voices, or a TTS voice that is not the approved one, is the exact defect the owner rejected.
  const narratedVoices = [
    ...new Set(
      c.shots
        .filter((s: any) => s.vo?.trim())
        .map((s: any) => (typeof s.voice === 'string' && s.voice.trim() ? s.voice.trim() : AD_VO_VOICE))
        .filter((v: string) => v !== NATIVE_VOICE),
    ),
  ];
  if (narratedVoices.length > 1) err('shots', `this reel would speak in ${narratedVoices.length} different narration voices (${narratedVoices.join(', ')}) — one reel, one narrator`);

  // House rule: a visible human must open the reel.
  if (c.shots[0]?.role !== 'presenter') {
    err('shots[0]', 'reel must OPEN on a `presenter` shot — faceless/slideshow reels are rejected by policy');
  }

  // ON-SCREEN duration: an L-cut relocates its seconds of audio onto the next shot's picture, so
  // those seconds are heard but never seen twice. The reel is that much shorter than sum(seconds).
  const total = c.shots.reduce((a: number, s: any) => a + (Number(s.seconds) || 0) - (Number(s.audioExtendsSec) || 0), 0);
  if (total > 90) warn('shots', `${total}s total — short-form ranks best under ~45s`);
  if (total < 8) warn('shots', `${total}s total — too short to land a hook + proof + CTA`);

  const ok = !issues.some((i) => i.level === 'error');
  return { ok, issues, creative: ok ? (c as CreativeScript) : null };
}
