# DEFECTS — 2026-07-25-call-karun-ya-kal-pe-rakhun-v2 (candidate B re-render, quality trial)

Audit basis: 10 frames (frames/audit01-10.jpg, 0.5s -> 28.5s) reviewed by eye
(01, 03, 04, 05, 07, 08, 09, 10 inspected individually); audio-report.txt.
Verdict scale: BLOCKER = do not publish; MAJOR = owner judgment call; MINOR = shippable.

## The three defect classes from candidate B

1. **Casting/ethnicity swap in s2 b-roll — FIXED (audit04 @9.8s, audit05 @12.9s).**
   s2 now shows a young Indian man in a navy kurta in a warm golden-hour room, tense fist
   lowering to a wooden table — the same protagonist as s1's presenter. The pinned prompt
   ("The same person as the presenter shot: young Indian man, navy kurta, same golden-hour
   light") worked on Kling. Residual (MINOR): Veo and Kling render two *similar* young Indian
   men, not one identical face — s2's beard is slightly fuller. At watch speed it reads as the
   same person; on a paused side-by-side it does not survive forensic scrutiny.

2. **Caption vs product-UI collision — CORE FAILURE FIXED, residual overlap remains.**
   Captions during s3/s4 now render in the TOP zone (y=330). At 22.3s — the exact timestamp of
   candidate B's unreadable three-layer stack on the Free-Kundli card — the caption now sits in
   the top band, fully legible (audit08). No caption ever lands on the "Free" badge, buttons, or
   form fields. Residual (MINOR): these pages carry body copy at the top too, so the caption
   still overlaps *dim paragraph text* (audit07, audit08) and, worst case, the gold hero title at
   25.4s (audit09, "PLAIN ENGLISH MEIN" over "Free Kundli — Your Vedic"): caption stays readable
   thanks to outline+shadow, but the title behind it is garbled while the line shows. Right full
   fix for a future pass: an opaque backing band (second ASS style with BorderStyle=3) for
   top-zone captions.

3. **Quiet mix / 3.5s near-silent stretch — FIXED (audio-report.txt).**
   -16.03 LUFS integrated (was -20.0), true peak -1.64 dBTP, linear two-pass loudnorm, zero
   clipping. The 3.5s near-silent hole at 4.7-8.3s is gone (new Veo take); no silent cold open.
   Residual (MINOR): three 1.3-2.0s VO gaps at shot transitions remain uncovered — media/music/
   does not exist, and synthesizing a tone bed is forbidden. Drop a licensed bed into
   media/music/ and the renderer will duck it under the VO automatically.

## Also fixed from candidate B's minor list

4. **End frame (28.5s, audit10): FIXED.** The reel now ends on the Free-Kundli HERO ("Free
   Kundli — Your Vedic Birth Chart, Instantly" + wordmark + nav) via the new capture.panToPx
   upward pan (900px -> 0), not a mid-scroll newsletter footer. Bonus: s4 is now a different
   page from s3, killing the "same grid twice" near-duplicate the original scorer flagged.
5. **Emotional mismatch (audit03 @6.7s): GONE.** The new s1 take looks down at the phone,
   pensive, mouth closed — matches "thumb freeze ho jata hai". No warm smile.

## New/residual issues found in THIS render

6. **MINOR — site launch banner half-cut at the end frame (audit10).** The live site's yellow
   "Launch offer NEWUSER30" banner sits at the very top of the free-kundli page; the end frame
   crops its first line and the VEDICHOUR wordmark overlaps its bottom edge. Ugly for ~1s. It
   also duplicates the CTA's NEWUSER30 message (harmless, arguably reinforcing).
7. **MINOR — CTA caption (last 2.6s, y=1400) overlaps the page's intro paragraph** ("...Sade
   Sati flags. No signup, no card.") on the end frame (audit10). Gold-on-dark with outline,
   readable, but not a clean band. Same future fix as #2 (backing band) would cover it.
8. **COSMETIC — the site's floating "Feedback" pill overlaps the Birth-time field** in the
   captured page (audit08-10). That is the live product's own UI, not a render bug.

## What is CLEAN
- Phone appears back-to-camera only (audit01); screen-blur guard held — zero gibberish text.
- No warped hands/extra fingers in any inspected frame (s2 fist is anatomically fine).
- Full-bleed 1080x1920 throughout, no letterboxing; verify PASS (29.00s, 30fps, h264).
- Hook lands clean of the face (audit01); karaoke captions clear of the mouth on presenter
  shots (audit03); word-sync sweep working (audit08 "HEA" mid-sweep).
- No hard audio tail cut; speech completes ~28.75s and decays naturally.
- Product screencaps are the real live pages, crisp and legible.

## Verdict
All three trial defect classes are fixed at source and verified in this render. Remaining items
are MINOR/cosmetic. Shippable at owner's discretion; the one change I would still make before
scaling spend: opaque backing band for top-zone + CTA captions.
