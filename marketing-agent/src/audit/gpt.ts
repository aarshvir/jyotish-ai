import type { LensSpec } from './runner';

/**
 * STAGE 2 — the five GPT CROSS-REVIEWS.
 *
 * The owner's mandate: "you have to call GPT five times... they have to send me feedback,
 * then incorporate the feedback". Project law §3 then fixed HOW: the GPT/codex CLI he already
 * pays for, not a metered API. Probed 2026-07-26 — `codex exec -s read-only` opens image files
 * from disk and reads them correctly (verified against a frame whose contents were known), so
 * all five lenses get real vision for $0.
 *
 * tier 'code' routes to codex first, keeping these five genuinely independent from the four
 * internal (Claude) audits above: different model, different blind spots.
 */
export const GPT_LENSES: LensSpec[] = [
  {
    lens: '1. first-second scroll-stop',
    stage: 'gpt',
    tier: 'code',
    withFrames: true,
    brief: `FIRST-SECOND SCROLL-STOP POWER. You are a hostile scroller with a 0.8 second attention budget.
Look at FRAME 01 (the opening moment) and judge ONLY the first ~2 seconds: composition, subject, contrast, the hook line, and whether there is a reason to stay. Score the stop-power out of 10 in your oneLiner.
Say specifically what a viewer sees in the first second and what would make them swipe. If the opening is generic stock-feeling footage, say so. Anchor every finding to a second in 0.0-2.0s, and flag anything later that breaks the promise the first second made.`,
  },
  {
    lens: '2. visual believability / AI tells',
    stage: 'gpt',
    tier: 'code',
    withFrames: true,
    brief: `FRAME-BY-FRAME VISUAL BELIEVABILITY. Go through the frames IN ORDER and, for each, state what you see and whether anything reveals it as AI-generated or fake: hands/fingers, teeth, eyes, ears, jewellery, morphing edges, warping background, physically impossible lighting or reflections, text rendered inside the image as gibberish, objects that change between frames, unnatural skin or hair.
Distinguish AI-GENERATED footage from REAL SCREEN RECORDINGS of a website — screen recordings are legitimate and their text is real. Only call out an AI tell you can actually point at, with its frame timestamp. If a frame is clean, do not invent a defect for it.`,
  },
  {
    lens: '3. on-screen text & caption legibility',
    stage: 'gpt',
    tier: 'code',
    withFrames: true,
    brief: `ON-SCREEN TEXT. Read every word visible in every frame — captions, burned-in wordmark, and the text of the product page itself — and report problems:
- Anything unreadable at phone size, low-contrast, clipped, overlapping, or colliding with page content behind it.
- Any MISSPELLING or broken word in a caption.
- Any JARGON visible on screen that a normal Indian professional would not understand. These specific terms are BANNED and must be flagged as at least "major" wherever they appear, including inside the captured product page: swiss ephemeris, lahiri, ayanamsa, sidereal, whole-sign, vimshottari.
- Any text that contradicts the spoken line at that moment.
Quote the exact text you read and give its frame timestamp.`,
  },
  {
    lens: '4. voice & audio naturalness',
    stage: 'gpt',
    tier: 'code',
    withFrames: false,
    brief: `VOICE AND AUDIO. You cannot hear the file, so reason from the transcript, the configured voice id, the shot boundaries and the ffmpeg measurements (loudnorm integrated LUFS, true peak, silencedetect gaps, per-shot narration-vs-shot-length fit).

OWNER HARD RULE — flag as "blocker":
  1. Anything that reads as a SYNTHETIC NARRATOR. An edge-tts / *Neural / "Neerja" voice id is synthetic by definition.
  2. Any voice or timbre switch mid-reel (presenter's own in-shot voice handing over to a different narrator voice). Give the exact second of the handover.

Then: dead air (any silence gap over ~1s and where a viewer would drop), lines rushed or cut by their shot length, loudness drift from the -16 LUFS target, clipping, and whether the script's rhythm sounds like a person or like a machine reading a paragraph.`,
  },
  {
    lens: '5. does the product prove the promise',
    stage: 'gpt',
    tier: 'code',
    withFrames: true,
    brief: `PROOF. The script makes a promise; the product footage must demonstrate it.
State, from the frames, exactly what the product screens SHOW (what page, what content, what a viewer could actually read). Then answer: does that demonstrate the specific value the script promised at that same second — a whole day of rated hour-windows, and plain-English guidance about what each window suits?

OWNER HARD RULE — flag as "blocker" if any frame shows a PRICING, CHECKOUT, PAYMENT or PLAN page. The ad demonstrates the report; it never shows the checkout.

Also flag: product footage that scrolls too fast to read, shows a page unrelated to the promise, ends mid-element, or shows a marketing page instead of the actual product. Anchor everything to frame timestamps.`,
  },
];
