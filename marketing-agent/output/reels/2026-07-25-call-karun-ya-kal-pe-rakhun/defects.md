# DEFECTS — 2026-07-25-call-karun-ya-kal-pe-rakhun (candidate B)

Audit basis: 10 frames (frames/audit01-10.jpg, 0.5s -> 28.5s) reviewed by eye; audio-report.txt.
Verdict scale: BLOCKER = do not publish; MAJOR = owner judgment call; MINOR = shippable.

## MAJOR
1. **Casting/ethnicity swap in the s2 b-roll (~12.9s, audit05).** s1 is a young INDIAN man in a
   navy kurta, golden-hour couch scene. s2 ("a single person takes a slow breath, lowers hand to
   table") rendered a EUROPEAN man — light skin, tousled brown hair, beige sweater, different
   room. The story is first-person ("main..."), so this reads as the protagonist changing race
   mid-reel. Root cause: the s2 visualPrompt says only "a single person" — Wan 2.7 defaulted to a
   Western look. The fixed prompt rules catch device screens and narration length but NOT subject
   continuity; worth adding "same young Indian person as the presenter" to b-roll prompts.
2. **Caption collides with product UI (~22.3s, audit08).** Karaoke line "HEAVIER CONVERSATION
   WINDOWS" lands on the Free-Kundli card, overlapping the big green "Free" and the
   "No credit card required" line — three text layers stacked, momentarily unreadable. Same
   defect class as candidate A's #3 (mid-screen captions vs dense real UI).
3. **~3.5s near-silent stretch at 4.7-8.3s** (see audio-report.txt): two adjacent gaps with a
   0.15s blip between them, spanning the s1->s2 cut, with NO music bed. On a 29s reel this is an
   early-retention killer — precisely where Meta scores drop-off.

## MINOR
4. **Emotional mismatch (~6.7s, audit03):** presenter smiles warmly while the line is
   "...thumb freeze ho jata hai" (anxiety). Reads as relieved, not frozen. Veo took the "intimate,
   hesitant mood" only partially.
5. **End frame is a mid-scroll footer (28.5s, audit10):** the reel ends on the pricing page's
   newsletter footer with the CTA caption overlapping footer link text, plus the VEDICHOUR wordmark
   overlapping the email-field label. Functional, but not a designed end card.
6. **Quiet mix: -20.0 LUFS integrated** (~6 LU under the -14 social norm; true peak only -3.8 dBTP).
   Platforms will normalize it up, but it will sound soft next to other reels if posted as-is.
7. Opening 1.4s is silent before the hook line lands (cold open; acceptable but flagging).

## What is CLEAN
- **Zero gibberish text risk in generated shots:** the phone appears back-to-camera in audit01 and
  as a soft glowing blur in audit03 — the f7fe1dd "no legible characters" guard demonstrably worked.
- No warped hands or extra fingers in any of the 10 frames (phone grip in audit01 is natural;
  the s2 fist is passable).
- No letterboxing; full-bleed 1080x1920 throughout.
- No hard audio tail cut: speech ends ~28.3s, last 0.4s decays to -39.8 dB RMS.
- No clipping anywhere (peak -3.8 dBFS, flat factor 0).
- s1 golden-hour presenter shot is the best-looking single shot across BOTH candidates.
- Product screencaps are the real live pricing page, crisp and legible.
