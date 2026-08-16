# DEFECTS — 2026-07-25-hr-ne-do-slots-bheje-v2 ($0 re-assembly, final-scene fix pass)

Audit basis: all 10 frames (frames/audit01-10.jpg at 0.5, 4.1, 7.7, 11.3, 14.9, 18.5, 22.1,
25.7, 29.3, 32.9s) reviewed by eye, plus audio-report.txt (loudnorm/silencedetect/astats).
History: first render pass fixed caption-band opacity; a 5-agent audit then BLOCKED the reel on
its FINAL SCENE only. This third pass ($0, screencap + edge-tts + ffmpeg re-assembly only)
fixed the final scene and re-audited. Final file: 33.40s, 1080x1920/30fps h264, verify PASS.
Verdict scale: BLOCKER = do not publish; MAJOR = owner judgment call; MINOR = shippable.

## The final-scene blocker — FIXED in this pass

The blocked end scene had three collisions: (a) the yellow NEWUSER30 launch banner garbling
the burned-in VEDICHOUR wordmark, (b) the gold closing CTA burned over the hero paragraph with
NO backing, (c) the floating yellow "Feedback" pill over the Birth-time field. All three gone:

- **Banner + Feedback pill stripped at capture time.** screencap.ts's kill-list now removes
  `#vh-launch-banner` and `button[aria-label="Give feedback"]` (selectors verified against the
  live DOM 2026-07-26) before the full-page shot. audit08/09/10: no banner, no pill anywhere
  in s4; the Birth-time field is fully visible.
- **CTA now sits on the same 94%-opaque navy band as the karaoke captions.** New `CtaBand`
  ASS style (BorderStyle=3, fill &H101A0A0A — identical to CaptionBand), selected automatically
  whenever the CTA plays over a product screencap window. Verified in work/captions.ass and on
  audit10.
- **No page paragraph beneath the CTA.** With the banner gone the page shifts up: the hero
  paragraph ends at device-px 1269, the CTA band starts ~1300 — the CTA sits in the
  paragraph→form gap, only overlapping the form's top edge (part of the "Birth time" label,
  hidden cleanly by the opaque band).
- **The end frame is HELD, fully composed.** s4 extended 7.9s -> 8.9s (VO tail margin 1.27s);
  the pan (900->0px, upward) now completes 3s early via the new capture `holdSec`, at reel-time
  ~30.4s. CTA fades in 30.8-31.0s over the already-settled frame -> ~2.4s of composed hold
  (≥1.5s required). audit10 (32.9s) == the hold frame: navbar, "FREE TOOL · JANAM KUNDALI"
  eyebrow, "Free Kundli — Your Vedic Birth Chart, Instantly" headline, intro paragraph, CTA on
  band, form (Birth date / Birth time / Birth city) beneath. Total 33.4s (within the 33.5s cap).

## The four defect classes the v2 rebuild fixed (unchanged, re-verified)

1. **Gibberish text — CLEAN.** v1's Kling AI-keyboard close-up stays replaced by real
   screencaps; every pixel of UI text in s2/s3/s4 is the live site. s1 presenter's phone is
   back-to-camera (audit01-02). Zero AI-rendered text anywhere.
2. **Captions vs product UI — FIXED.** All s2/s3/s4 karaoke captions render top-zone on the
   94%-opaque navy band (audit03-09), and the closing CTA is now banded too (see above).
   Residual MINOR: page text WIDER than the band still peeks at its left/right edges
   (audit08 "…showing your" around "KOI OUTCOME CLAIM"). Unavoidable without full-width bands.
3. **Audio fit (v1: s3's 14.9s narration cut at 8s) — FIXED.** Shots sized FROM the VO:
   s2 3.00s VO in 3.3s, s3 14.88s VO in 15.2s, s4 7.63s VO in 8.9s. No line is cut; the reel
   ends on a ~2.06s silent hold (silencedetect 31.36-33.42s), not a mid-word chop. MINOR: four
   1.0-1.6s VO gaps at shot transitions remain uncovered because media/music/ has no licensed
   bed (synthesizing one is forbidden). Drop a bed into media/music/ and the renderer ducks it
   automatically.
4. **Loudness — FIXED.** Final file measures **-16.20 LUFS integrated** (target -16 ±0.5,
   two-pass linear loudnorm), true peak -1.45 dBTP, no clipping (Flat factor 0), RMS -20.4 dB.

## Residuals in THIS render (all MINOR/COSMETIC — shippable)

5. **MINOR — wordmark adjacency.** With the banner gone the end frame's burned VEDICHOUR
   wordmark no longer garbles against yellow, but it sits beside the site's own navbar
   "VedicHour" logo (audit09/10) — a double-brand moment on dark background, legible, not a
   collision. Same on s2 (audit03, raw reused from the passing pass).
6. **COSMETIC — s1 caption timing.** The hook occupies 0-2.7s, so s1's dialogue captions start
   at "AAYA: 10 AM" (audit02). Identical to v1/pipeline behavior (capStart = hookEnd).
7. **COSMETIC — s1 caption font.** The ~4s s1 karaoke caption is DM Sans while the 0.5s hook is
   serif (Cormorant). Restyling it would mean changing the shared Caption style for every
   presenter reel or threading a new per-reel font option through finish() — deliberately NOT
   done in a $0 surgical pass; logged for the pipeline backlog.
8. **OBSERVATION — Veo 24fps source.** s1's raw is 24fps, conformed to 30fps in normalize (as
   in v1). No visible judder at watch speed in the inspected frames.

## What is CLEAN
- s1 presenter take intact and untouched from the paid v1 render — no re-generation, no double
  grade; s2/s3 raws reused unchanged from the pass that already cleared audit.
- Full-bleed 1080x1920/30fps/h264 throughout, verify PASS (33.40s), no black frames, no
  letterboxing.
- Zero AI-text surfaces; zero fabricated UI — every product frame is the real live site.
- $0 spent in this pass: Playwright screencap + edge-tts + ffmpeg only; no fal.ai, no paid API.

## Verdict
**SHIPPABLE.** The final-scene blocker (banner/wordmark garble + bandless CTA over the
paragraph + Feedback pill) is fixed and verified frame-by-frame; remaining items are the same
minor residual classes the sibling v2 shipped with, or smaller. NOT published — awaiting owner.
