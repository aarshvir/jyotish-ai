import type { LensSpec } from './runner';

/**
 * STAGE 1 — the four INTERNAL audits. $0, routed through brain(tier:'smart') so the Claude
 * subscription answers first and the GPT/codex cross-review in stage 2 stays a genuinely
 * independent second opinion (project law §3).
 *
 * Two of the four carry an OWNER HARD RULE. They are written into the brief in the owner's
 * own terms, and the same rules are asserted deterministically in hardrules.ts so a
 * agreeable model cannot let them through.
 */
export const INTERNAL_LENSES: LensSpec[] = [
  {
    lens: 'a. ad-craft / hook',
    stage: 'internal',
    tier: 'smart',
    withFrames: true,
    brief: `AD CRAFT. Does this work as an AD, second by second?
- The first 1.0s: does frame 1 stop a thumb? Is the hook line legible, specific and emotionally true for an Indian professional?
- Beat structure: hook -> tension -> proof -> CTA. Name the second each beat lands. Flag any dead beat where a viewer would swipe.
- Is the promise made in the hook actually PAID OFF on screen later? Name the timestamp where the payoff lands, or say it never does.
- Is the CTA earned, clear, and on screen long enough to read?
- Would a viewer be able to say what this product does after watching once? If not, say exactly what is missing.`,
  },
  {
    lens: 'b. script & voice',
    stage: 'internal',
    tier: 'smart',
    withFrames: false,
    brief: `SCRIPT AND VOICE. Read the script (which lines are spoken ON CAMERA by the presenter vs which are voice-over NARRATION) together with the audio measurements.

OWNER HARD RULE — you MUST flag it as a "blocker" if either is true:
  1. Any narration that reads as a SYNTHETIC NARRATOR (TTS). The configured voice id is in the evidence: an edge-tts / *Neural / "Neerja" voice is synthetic and banned in an ad.
  2. Any VOICE or TIMBRE SWITCH inside one reel — e.g. the presenter speaks in their own native in-shot voice and then a different (narrator) voice takes over. Name the exact second the handover happens (the shot boundaries are in the evidence).

Then judge the writing itself: is it how a real person talks, or ad-speak? Is any line rushed for its shot length? Does any sentence get cut? Is there jargon a non-astrologer would not understand (swiss ephemeris, lahiri, ayanamsa, sidereal, whole-sign, vimshottari are all banned)? Are the claims honest — timing awareness, never guaranteed outcomes?`,
  },
  {
    lens: 'c. typography / captions',
    stage: 'internal',
    tier: 'smart',
    withFrames: true,
    brief: `TYPOGRAPHY AND CAPTIONS. Use the audit frames AND the caption timeline.
- Legibility on a phone at arm's length: size, weight, contrast against whatever is behind it. Name any frame where the caption competes with page text or a bright background.
- Caption bands: does the band actually cover the text it is meant to sit on, or does content leak at its edges?
- Safe areas: is anything within ~180px of the top or ~320px of the bottom, where the Instagram/TikTok UI covers it?
- Consistency: font, case, colour and position across the reel. Flag any style that changes for no reason.
- Timing: is any caption on screen too briefly to read (rule of thumb: under ~0.9s for a short line)? Does any caption contradict what is being said at that moment?
- Any burned-in wordmark or logo colliding with on-screen page content.`,
  },
  {
    lens: 'd. motion / pacing / on-screen',
    stage: 'internal',
    tier: 'smart',
    withFrames: true,
    brief: `MOTION, PACING, AND WHAT IS LITERALLY ON SCREEN. Open every frame and describe what you actually see before judging.

OWNER HARD RULE — flag as a "blocker" if ANY frame shows a PRICING, CHECKOUT, PAYMENT or PLAN-SELECTION page. Product scrolls must show THE REPORT (the hour slots and the plain-English "what this window suits" text). An ad never shows the viewer the checkout.

Then judge: shot rhythm (is any shot held so long it goes dead? name the seconds), scroll/pan speed (readable or motion-sick?), whether the pan lands on a composed frame or stops mid-element, any black/blank/duplicated frame, any frame where the UI is cut off or half-loaded, and whether the product footage actually PROVES the claim the script makes at that moment.`,
  },
];
