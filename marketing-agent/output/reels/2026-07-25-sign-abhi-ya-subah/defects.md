# DEFECTS — 2026-07-25-sign-abhi-ya-subah (candidate A)

Audit basis: 10 frames (frames/audit01-10.jpg, 0.5s -> 32.5s) reviewed by eye; audio-report.txt.
Verdict scale: BLOCKER = do not publish; MAJOR = owner judgment call; MINOR = shippable.

## MAJOR
1. **Presenter continuity break s1 -> s4.** Opening presenter: light-blue shirt, night-time desk,
   bluish lamp light (audit01/02). Closing presenter (audit10, 32.5s): different man — mustard
   turtleneck + grey blazer, daylit bookshelf room. Two AI generations of "young Indian
   professional" that do not read as the same person. B-roll and product shots sit between them,
   so it can pass as an intentional cutaway, but a viewer who notices will read it as AI sloppiness.
2. **Caption pile-up at ~18.3s (audit06).** Two karaoke caption lines are visible at once over the
   brass-instrument b-roll — "VEDICHOUR SWISS EPHEMERIS" over a ghost of the following/previous
   line — momentarily unreadable mush. Likely segment overlap at a caption boundary, not a
   font/glyph failure. Worst single frame of the reel.
3. **Caption collides with product UI text (~11.2s, audit04).** Mid-screen karaoke line
   "KE LIYE TONIGHT" lands directly on the pricing card's "30-day complete forecast" row, and the
   VEDICHOUR wordmark overlaps the "PDF download" row at the top. Caption-over-legible-UI is
   visually noisy exactly where the product is supposed to look premium.

## MINOR
4. **No music bed** ("none found in media/") — so the 4 narration gaps in audio-report.txt
   (worst: 2.6s at 13.7-16.3s during the pricing screencap) are fully silent dead air. With a bed
   they would be normal breathing room; without one the reel feels stalled during the longest gap.
5. **AI teeth/mouth texture** on the s1 presenter mid-speech (audit01/02) — typical Veo artifact,
   visible when paused, not distracting at speed.
6. **Offer-letter paper** (audit01/02) carries blurred pseudo-text with a black redacted-style
   header block. Deliberately illegible (prompt asked "no legible text") — reads as a stylized
   prop, NOT gibberish; noting it because a paused frame shows obviously fake document texture.
7. Loudness -16.3 LUFS integrated is ~2 LU quieter than the usual -14 social target; platforms
   will normalize, fine to ship.

## What is CLEAN
- No gibberish device screens anywhere (the fixed prompts held: no phones/laptops in generated shots).
- No warped hands (pen grips in audit01/02/10 hold up), no extra fingers spotted in the 10 frames.
- No letterboxing; full-bleed 1080x1920 on every frame.
- No hard audio cut at the end: final word lands ~32.3s, last 0.4s decays to -53 dB RMS.
- Product screencap is the REAL pricing page, crisp and legible.
- Brass astronomical instrument b-roll (audit06/07) is genuinely handsome; tick marks abstract, not text.
