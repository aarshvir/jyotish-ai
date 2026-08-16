# REVIEW — 2026-07-26-same-pitch-do-alag-windows-v2

## VERDICT

```
VERDICT: BLOCK
REASON:  4 blocker-severity finding(s); 4 lens(es) returned "block" (1. first-second scroll-stop, 2. visual believability / AI tells, 3. on-screen text & caption legibility, 5. does the product prove the promise)
REEL:    2026-07-26-same-pitch-do-alag-windows-v2 · 15.6s · 1080x1920
PASSES:  11 (4 internal · 5 GPT cross-review · 2 deterministic)
FINDINGS: 4 blocker · 18 major · 10 minor · 4 nit
COST:    $0.0000 (CLI subscriptions are $0; only the paid fallback bills)
STATUS:  awaiting owner approval — nothing publishes until `npm run approve 2026-07-26-same-pitch-do-alag-windows-v2`
```

## Passes

| lens | stage | by | verdict | one-liner |
|---|---|---|---|---|
| a. ad-craft / hook | internal | claude | **SHIP WITH NOTES** | Solid hook and product payoff; block on presenter mismatch and 1s proof-beat audio dropout before publishing. |
| b. script & voice | internal | claude | **SHIP WITH NOTES** | Voice is clean and consistent throughout; closing CTA is likely rushed in its 2.8s window. |
| c. typography / captions | internal | claude | **SHIP WITH NOTES** | Hook legibility, in-safe-zone wordmark, doubled VEDICHOUR on product shot, and 0.49 s 'SE.' flash must be fixed before high-reach push. |
| d. motion / pacing / on-screen | internal | claude | **SHIP WITH NOTES** | No pricing pages anywhere; two confirmed dead audio gaps and face-obscuring hook caption must be fixed before publish. |
| 1. first-second scroll-stop | gpt | codex | **BLOCK** | Block—3/10 stop-power: generic presenter, ambiguous hook, and a first-second audio stall give no instant reason to stay. |
| 2. visual believability / AI tells | gpt | codex | **BLOCK** | Block: the closing smile has visibly mangled AI-generated teeth. |
| 3. on-screen text & caption legibility | gpt | codex | **BLOCK** | Block: the caption band slices report text, while visible astrology jargon and faint labels weaken comprehension. |
| 4. voice & audio naturalness | gpt | codex | **SHIP WITH NOTES** | One noticeable mid-sentence dead-air gap needs tightening; voice continuity, loudness, and peaks otherwise pass. |
| 5. does the product prove the promise | gpt | codex | **BLOCK** | Block: readable guidance appears, but the footage never proves a whole day and cuts off mid-card. |
| hard-rules (deterministic) | deterministic | regex | **SHIP WITH NOTES** | 1 measurable defect(s), none blocking. |
| pre-flight (retro, on the creative plan) | deterministic | rules | **SHIP** | The plan this reel came from passes pre-flight. |

## Findings


### BLOCKER

- **[0.5s]** Viewer sees generic stock-feeling corporate footage: a centered man in a grey shirt holding a tablet against a blown-out office window. Nothing visually shows two timing windows or astrology, so it reads as a generic business ad and invites an immediate swipe.
  - **fix:** Open on a bold split-screen product comparison: “10–11 AM · 75” versus “11–12 PM · 59,” with the presenter secondary or removed.
  - _auto-fixable ($0 re-assembly) · raised by: 1. first-second scroll-stop_
- **[5.4-11.9s]** The footage does not demonstrate the promised whole day. At 5.4s the sample-report intro claims “Every hour scored”; at 7.0s the day summary shows Monday, Bangalore, score 70 and names three windows; at 8.6s, 10.2s and 11.9s only cards from 10–11am through 1–2pm appear. Viewers never see the full day of rated hour-windows.
  - **fix:** Replace the capture with a readable overview showing every hour-window for the day, then pause on representative cards with their rating, score and guidance.
  - _auto-fixable ($0 re-assembly) · raised by: 5. does the product prove the promise_
- **[7.0s]** Caption band "KA SCORE, EK" slices through the product-page sentence "the times, the scores and the ruling planets are", leaving chopped letter fragments at the band edge.
  - **fix:** Reserve a fixed caption-safe area outside the report capture, or reposition the capture so page text never scrolls beneath the band.
  - _auto-fixable ($0 re-assembly) · raised by: 3. on-screen text & caption legibility_
- **[15.1s]** The presenter's exposed teeth deform into irregular, fused shapes with incoherent tooth and gum boundaries, visibly revealing AI-generated footage.
  - **fix:** Replace the closing presenter shot with a clean take, or cut to the product/CTA before his mouth opens.
  - _needs re-render (costs money) · raised by: 2. visual believability / AI tells_

### MAJOR

- **[0.5-2.1s]** Hook caption 'Same pitch. Do alag windows.' is placed mid-frame and lands squarely over the presenter's forehead and upper face in both frame 01 (0.5s) and frame 02 (2.1s). Facial expression is the primary scroll-stopping signal in a talking-head format; the text occludes the face during the exact 2.7s window it needs to be working hardest.
  - **fix:** Reposition the hook text to the upper-sixth of the frame (above the hairline) or the lower-third so the face is fully unobstructed during the hook segment.
  - _auto-fixable ($0 re-assembly) · raised by: d. motion / pacing / on-screen_
- **[0.5s]** The oversized serif hook sits directly across the presenter’s forehead and face. Mixed white/gold lettering over alternating dark hair and bright skin creates visual clutter and weakens the only human focal point.
  - **fix:** Move the hook into a solid high-contrast band above or below the face, using one bold sans-serif color treatment and fewer words.
  - _auto-fixable ($0 re-assembly) · raised by: 1. first-second scroll-stop_
- **[0.7-1.5s]** Dead audio gap of 0.82s confirmed by silencedetect (silence_start: 0.716938, silence_end: 1.536396) — in frame 01 (0.5s) and frame 02 (2.1s) the presenter's mouth is visibly moving but no voice plays for nearly a full second during the hook window. Opening silence in a Reels hook is a direct scroll-away trigger.
  - **fix:** Trim the s1 Veo clip to remove the pre-speech pause so voice is present from the first frame, or nudge the clip start ~0.5s earlier to eat the silent head.
  - _auto-fixable ($0 re-assembly) · raised by: d. motion / pacing / on-screen_
- **[0.72-1.54s]** A measured 0.82-second audio silence lands inside the critical opening, draining momentum while the visual remains essentially static.
  - **fix:** Remove the opening pause so the decision question or a sharp sonic cue begins at 0.0s and continues through the first second.
  - _auto-fixable ($0 re-assembly) · raised by: 1. first-second scroll-stop_
- **[5.4-12.8s]** During the product screen-capture segment (frames 04-08), the reel's burned-in VEDICHOUR wordmark and the sample-report page's own VEDICHOUR header element are simultaneously visible in the top zone — two identical brand words in the same frame at the same time. It reads as a production artifact rather than intentional branding.
  - **fix:** Either (a) suppress the burned-in reel wordmark during the product shot since the page already surfaces the brand, or (b) pre-scroll the capture so the website header is off-frame before the clip begins.
  - _auto-fixable ($0 re-assembly) · raised by: c. typography / captions_
- **[5.4-7.0s]** Unexplained astrology jargon is prominently visible: "Cancer rising" and "Moon in Scorpio · Jyeshtha". "Jyeshtha" is especially opaque to a normal Indian professional.
  - **fix:** Crop or hide these badges, or replace them with a plain-language label such as "Birth-chart details used for this report".
  - _auto-fixable ($0 re-assembly) · raised by: 3. on-screen text & caption legibility_
- **[8.6-11.9s]** The labels "Mercury hour" and "Moon hour" are small, pale pink text on white and become barely readable at phone size.
  - **fix:** Render all hour labels in a darker neutral color with at least 4.5:1 contrast and increase their weight or size.
  - _auto-fixable ($0 re-assembly) · raised by: 3. on-screen text & caption legibility_
- **[8.6-11.9s]** The visible cards do prove plain-English guidance: 10–11am is “Favourable 75” and good for a pitch/demo; 11am–12pm is “Mixed 59” and better for coffee than a decision; 12–1pm is “Mixed 49” with advice to clear easy messages and avoid signing. However, this proves only three adjacent windows, not the promised day-wide choice.
  - **fix:** Show separated windows across the day—including the highlighted 9–10am and 5–6pm options—long enough to read their scores and suitability lines.
  - _advisory · raised by: 5. does the product prove the promise_
- **[9.5-10.5s]** Audio silence of ~1.0s during the product proof section, confirmed by silencedetect (silence_start 9.516s, duration 1.001s). At this moment the report screen is on camera and the voice-over is mid-sentence ('kaunsa ghanta pitch ke liye theek hai'). A full second of dead audio while the product is front-and-centre is the single highest swipe-risk moment in the reel.
  - **fix:** Re-render the s2 Veo voice segment or crossfade/trim audio to close the gap. If the gap is between two Veo clips, overlap them by 0.5s in the assemble step.
  - _auto-fixable ($0 re-assembly) · raised by: a. ad-craft / hook_
- **[9.5-10.5s]** A second dead audio gap of 1.0s (silencedetect: silence_start 9.516125, silence_end 10.517542) falls over the product section while frames 07-08 are showing the hour-slot rows and the caption reads 'LIYE THEEK HAI.' / 'ASLI ASTRONOMICAL DATA'. The narration claim appears in text but the voice is absent — breaks the proof moment when the screen evidence should be landing hardest.
  - **fix:** Inspect the Veo s2 audio at approximately its 4–5s internal mark (which maps to reel 9.5–10.5s) for a breath pause; trim or crossfade over the gap before the loudnorm pass.
  - _auto-fixable ($0 re-assembly) · raised by: d. motion / pacing / on-screen_
- **[9.52-10.52s]** A 1.00s silence interrupts the core explanation while “LIYE THEEK HAI” remains on screen, creating a noticeable mid-sentence stall.
  - **fix:** Tighten the pause to roughly 0.3-0.5s and retime the narration/caption together.
  - _auto-fixable ($0 re-assembly) · raised by: 4. voice & audio naturalness_
- **[11.9-12.8s]** The report ends mid-element: at 11.9s the 1–2pm card shows only “Favourable 71” and “Moon hour”; its guidance is below-frame, then product footage cuts away at 12.8s.
  - **fix:** Stop on a fully visible card with its guidance, or finish the scroll before cutting to the presenter.
  - _auto-fixable ($0 re-assembly) · raised by: 5. does the product prove the promise_
- **[12.42-12.91s]** Caption 'SE.' is on screen for only 0.49 s — less than half the 0.9 s minimum. At under half a second this single-syllable trailing word appears and disappears faster than most viewers can consciously register it as a distinct caption card.
  - **fix:** Merge 'SE.' back into the preceding card so 'ASLI ASTRONOMICAL DATA SE.' reads as one 2.28 s caption (10.59-12.91s), eliminating the flash-cut fragment entirely.
  - _auto-fixable ($0 re-assembly) · raised by: c. typography / captions_
- **[12.8-15.6s]** s4 spoken line is 8 words in a 2.8s rendered shot (2.86 wps vs 2.3 limit). Script was authored for 4s but Veo generated only 2.8s — 'Pitch se pehle apna din dekho - free hai' will either be rushed or the tail gets clipped before 'free hai' lands.
  - **fix:** Either trim s4 script to ≤6 words (e.g. 'Apna din dekho — free hai.') to fit the 2.8s window, or re-request a 4s Veo clip to match the authored duration.
  - _auto-fixable ($0 re-assembly) · raised by: b. script & voice_
- **[13.5-15.1s]** Presenter in s4 (close-up) looks like a different person from s1: white/light shirt vs grey shirt in frames 01-03, noticeably different hair (swept-back vs natural medium), slightly different face structure. A viewer who replays or pauses will clock two different people. Kills the authentic-person feel Veo native was bought to deliver.
  - **fix:** Regenerate s4 (presenter_close) with an explicit character reference seeded from s1's frame — same grey shirt, same hair, same face angle. Do not re-render s1.
  - _needs re-render (costs money) · raised by: a. ad-craft / hook_
- **[0.0-2.7s]** Hook text 'Same pitch. Do alag / windows.' in amber drop-shadow sits directly over the presenter's near-white blown-out face/forehead (strong backlight visible in frame 01; lens flare top-right in frame 02). The drop shadow is thin. Against that near-white background the hook reads weakly at phone-arm-length distance, especially in bright ambient conditions. This is the highest-stakes typography m
  - **fix:** Add a semi-transparent dark radial scrim behind the hook text, or reposition it to the lower-thirds where the presenter's mid-gray shirt provides a neutral backing. Alternatively, significantly increase the stroke/shadow weight so the text passes contrast against near-white.
  - _auto-fixable ($0 re-assembly) · raised by: c. typography / captions_
- **[n/a]** VEDICHOUR wordmark burns in at approximately 100-110 px from the top of the 1920 px frame (visible in every frame including the dark letterbox in frames 01-03 and the thin strip in frames 09-10). Instagram Reels and TikTok UI (progress bar, camera-switch button, back arrow) occupies roughly 150-180 px from the top. The brand identifier sits inside that unsafe zone and will be partially or fully oc
  - **fix:** Move the wordmark down to at least y=200 px (≈10.4 % from top) so it clears platform UI on all target surfaces.
  - _auto-fixable ($0 re-assembly) · raised by: c. typography / captions_
- **[0.0-2.0s]** “Same pitch. Do alag windows.” is ambiguous without visual context—“windows” could mean browser, office, or time—and offers no consequence or curiosity payoff within the viewer’s 0.8-second budget.
  - **fix:** Replace it with a self-explanatory decision hook such as “Client pitch: 10 baje ya 11?” while showing the two different hour scores immediately.
  - _advisory · raised by: 1. first-second scroll-stop_

### MINOR

- **[0.5-2.1s]** Hook text 'Same pitch. Do alag windows.' is positioned mid-frame against a blown-out overexposed background in frames 01 and 02. The text has a shadow but the background behind 'Do alag' is nearly white — contrast drops below reliable legibility on a bright phone screen in sunlight. First 1s must be bulletproof.
  - **fix:** Add a semi-transparent dark scrim (20-30% opacity black rect) behind the hook text only, or increase the shadow spread on the caption renderer for the Hook style.
  - _auto-fixable ($0 re-assembly) · raised by: a. ad-craft / hook_
- **[3.85-4.70s]** Caption 'HAI - KAUNSA' is on screen for 0.85 s, just under the 0.9 s minimum for a 3-word phrase.
  - **fix:** Extend this card to 0.9 s by absorbing 0.05 s from the gap before the next caption, or merge it forward with 'BAS WINDOW ALAG'.
  - _auto-fixable ($0 re-assembly) · raised by: c. typography / captions_
- **[5.4s]** Frame 04 shows the product section opening mid-transition: the dark navy hero occupies the upper half and the light parchment report body the lower half, creating a visually split frame rather than a clean opening composition. The viewer's first look at the report is a page caught between two sections.
  - **fix:** Delay the scroll-start of the capture by 0.4–0.6s so the first stable frame lands on the 'Monday · Bangalore' day card rather than mid-hero-exit.
  - _auto-fixable ($0 re-assembly) · raised by: d. motion / pacing / on-screen_
- **[6.31-7.18s]** Caption 'KA SCORE, EK' is on screen for 0.87 s, just under the 0.9 s minimum for a 3-word phrase.
  - **fix:** Extend to 0.9 s by taking 0.03 s from the gap between this and the following caption.
  - _auto-fixable ($0 re-assembly) · raised by: c. typography / captions_
- **[7.0s]** The legend "Strong 80–100", "Favourable 60–79", and "Mixed 40–59" uses pale green, yellow, and pink text on white; parts are too low-contrast at phone size.
  - **fix:** Use darker text colors meeting at least 4.5:1 contrast and slightly increase the legend font weight.
  - _auto-fixable ($0 re-assembly) · raised by: 3. on-screen text & caption legibility_
- **[8.6-11.9s]** Product labels "Sun hour", "Venus hour", "Mercury hour", and "Moon hour" are unexplained planetary-hour jargon for a general professional audience.
  - **fix:** Use purpose-first labels such as "Visibility window (Sun)" and "Decision window (Mercury)", or add a brief plain-language explanation.
  - _advisory · raised by: 3. on-screen text & caption legibility_
- **[9.5-10.5s]** 1.00s of dead air mid-reel — short-form viewers drop on silence.
  - **fix:** Tighten the shot transition or duck a licensed music bed under the gap (media/music/).
  - _auto-fixable ($0 re-assembly) · raised by: hard-rules_
- **[13.0-15.6s]** CTA band packs three lines of text — 'vedichour.com – free chart. Your Life, Decoded Hour by Hour.' — into a 2.6s window. The URL, the offer word ('free chart'), and the tagline compete for one read. On first watch the viewer is also hearing the presenter talk. The tagline 'Your Life, Decoded Hour by Hour' will not register.
  - **fix:** Strip the tagline from the CtaBand; show only 'vedichour.com — free chart'. Tagline is already in the brand watermark at top. Two lines in 2.6s is comfortable; three is not.
  - _auto-fixable ($0 re-assembly) · raised by: a. ad-craft / hook_
- **[13.0-15.6s]** CtaBand ('vedichour.com - free / chart. Your Life, Decoded / Hour by Hour.') is positioned mid-frame at approximately 55 % from the top — sitting over the presenter's torso rather than anchored to the lower third. CTAs positioned mid-body read as caption content, not as an action prompt. Additionally the CtaBand uses mixed case while all body captions are ALL CAPS, which is a style break even if i
  - **fix:** Anchor the CtaBand so its bottom edge sits no lower than 320 px from the bottom of the 1920 px frame (i.e. top edge ≈ y 1450 px). If mixed case is deliberate for URL readability, document it as the CtaBand style rule so it does not look accidental.
  - _auto-fixable ($0 re-assembly) · raised by: c. typography / captions_
- **[13.5-15.6s]** The s4 close-up presenter (frames 09 and 10) has a noticeably squarer jaw, different eye spacing, and heavier facial structure compared to the s1 wide shot (frames 01–03). This is Veo character drift between two separate generation calls — an alert viewer perceives two different people across the 15-second ad.
  - **fix:** Regenerate s4 with an explicit character reference image from s1 or a shared Veo seed/prompt suffix that locks the face; alternatively, extend the s1 clip with a slow push-in rather than cutting to an independent close-up generation.
  - _needs re-render (costs money) · raised by: d. motion / pacing / on-screen_

### NIT

- **[2.1s]** Large AI-generated golden lens flare in top-right corner of frame 02 bleeds into the black letterbox bar. On close inspection it signals synthetic origin. Not a swipe trigger at real playback speed but visible on pause.
  - **fix:** Accept as Veo generation artifact if no post-process step exists; if a compositing pass is possible, mask the top-right flare. Low priority vs the two major findings.
  - _needs re-render (costs money) · raised by: a. ad-craft / hook_
- **[2.1s]** Frame 02 shows a warm orange/golden light bloom bleeding into the top-right corner of the black letterbox bar — the Veo background window light clipping through what should be a solid brand bar.
  - **fix:** Mask the letterbox bars to a fully opaque solid fill (not a crop-based overlay) so no video layer can bleed through.
  - _auto-fixable ($0 re-assembly) · raised by: d. motion / pacing / on-screen_
- **[13.0-15.6s]** s4 spoken line 'Pitch se pehle apna din dekho - free hai' carries zero captions — the CtaBand text replaces them. A viewer watching silently misses the narrative CTA entirely and sees only 'vedichour.com - free chart' which is a URL, not a motivating line.
  - **fix:** Add a caption line for s4's spoken text in the 0.2s before the CtaBand, or rewrite s4 so the spoken line and the CtaBand text match word-for-word.
  - _auto-fixable ($0 re-assembly) · raised by: b. script & voice_
- **[0-5.2s]** s1 has 12 words in 5.2s (2.31 wps, limit 2.3). A silence of 0.82s at 0.7–1.5s means the presenter is actually speaking for ~4.4s, pushing effective rate to ~2.74 wps. Playback will confirm whether it sounds natural or clipped.
  - **fix:** If playback sounds fine, accept. If hurried: drop 'Client same hai.' — 'Deck same hai. Bas window alag hai — kaunsa lun?' is 9 words and fits easily.
  - _auto-fixable ($0 re-assembly) · raised by: b. script & voice_

## Fix queue (auto-fixable, $0)

The render/assembly path can consume these without spending anything (also in `fix_queue.json` and the `fix_queue` table):

- [0.5s] Viewer sees generic stock-feeling corporate footage: a centered man in a grey shirt holding a tablet against a blown-out office window. Nothing visually shows two timing windows or astrology, so it reads as a generic business ad and invites an immediate swipe. → Open on a bold split-screen product comparison: “10–11 AM · 75” versus “11–12 PM · 59,” with the presenter secondary or removed.
- [5.4-11.9s] The footage does not demonstrate the promised whole day. At 5.4s the sample-report intro claims “Every hour scored”; at 7.0s the day summary shows Monday, Bangalore, score 70 and names three windows; at 8.6s, 10.2s and 11.9s only cards from 10–11am through 1–2pm appear. Viewers never see the full day of rated hour-windows. → Replace the capture with a readable overview showing every hour-window for the day, then pause on representative cards with their rating, score and guidance.
- [7.0s] Caption band "KA SCORE, EK" slices through the product-page sentence "the times, the scores and the ruling planets are", leaving chopped letter fragments at the band edge. → Reserve a fixed caption-safe area outside the report capture, or reposition the capture so page text never scrolls beneath the band.
- [0.5-2.1s] Hook caption 'Same pitch. Do alag windows.' is placed mid-frame and lands squarely over the presenter's forehead and upper face in both frame 01 (0.5s) and frame 02 (2.1s). Facial expression is the primary scroll-stopping signal in a talking-head format; the text occludes the face during the exact 2.7s window it needs to be working hardest. → Reposition the hook text to the upper-sixth of the frame (above the hairline) or the lower-third so the face is fully unobstructed during the hook segment.
- [0.5s] The oversized serif hook sits directly across the presenter’s forehead and face. Mixed white/gold lettering over alternating dark hair and bright skin creates visual clutter and weakens the only human focal point. → Move the hook into a solid high-contrast band above or below the face, using one bold sans-serif color treatment and fewer words.
- [0.7-1.5s] Dead audio gap of 0.82s confirmed by silencedetect (silence_start: 0.716938, silence_end: 1.536396) — in frame 01 (0.5s) and frame 02 (2.1s) the presenter's mouth is visibly moving but no voice plays for nearly a full second during the hook window. Opening silence in a Reels hook is a direct scroll-away trigger. → Trim the s1 Veo clip to remove the pre-speech pause so voice is present from the first frame, or nudge the clip start ~0.5s earlier to eat the silent head.
- [0.72-1.54s] A measured 0.82-second audio silence lands inside the critical opening, draining momentum while the visual remains essentially static. → Remove the opening pause so the decision question or a sharp sonic cue begins at 0.0s and continues through the first second.
- [5.4-12.8s] During the product screen-capture segment (frames 04-08), the reel's burned-in VEDICHOUR wordmark and the sample-report page's own VEDICHOUR header element are simultaneously visible in the top zone — two identical brand words in the same frame at the same time. It reads as a production artifact rather than intentional branding. → Either (a) suppress the burned-in reel wordmark during the product shot since the page already surfaces the brand, or (b) pre-scroll the capture so the website header is off-frame before the clip begins.
- [5.4-7.0s] Unexplained astrology jargon is prominently visible: "Cancer rising" and "Moon in Scorpio · Jyeshtha". "Jyeshtha" is especially opaque to a normal Indian professional. → Crop or hide these badges, or replace them with a plain-language label such as "Birth-chart details used for this report".
- [8.6-11.9s] The labels "Mercury hour" and "Moon hour" are small, pale pink text on white and become barely readable at phone size. → Render all hour labels in a darker neutral color with at least 4.5:1 contrast and increase their weight or size.
- [9.5-10.5s] Audio silence of ~1.0s during the product proof section, confirmed by silencedetect (silence_start 9.516s, duration 1.001s). At this moment the report screen is on camera and the voice-over is mid-sentence ('kaunsa ghanta pitch ke liye theek hai'). A full second of dead audio while the product is front-and-centre is the single highest swipe-risk moment in the reel. → Re-render the s2 Veo voice segment or crossfade/trim audio to close the gap. If the gap is between two Veo clips, overlap them by 0.5s in the assemble step.
- [9.5-10.5s] A second dead audio gap of 1.0s (silencedetect: silence_start 9.516125, silence_end 10.517542) falls over the product section while frames 07-08 are showing the hour-slot rows and the caption reads 'LIYE THEEK HAI.' / 'ASLI ASTRONOMICAL DATA'. The narration claim appears in text but the voice is absent — breaks the proof moment when the screen evidence should be landing hardest. → Inspect the Veo s2 audio at approximately its 4–5s internal mark (which maps to reel 9.5–10.5s) for a breath pause; trim or crossfade over the gap before the loudnorm pass.
- [9.52-10.52s] A 1.00s silence interrupts the core explanation while “LIYE THEEK HAI” remains on screen, creating a noticeable mid-sentence stall. → Tighten the pause to roughly 0.3-0.5s and retime the narration/caption together.
- [11.9-12.8s] The report ends mid-element: at 11.9s the 1–2pm card shows only “Favourable 71” and “Moon hour”; its guidance is below-frame, then product footage cuts away at 12.8s. → Stop on a fully visible card with its guidance, or finish the scroll before cutting to the presenter.
- [12.42-12.91s] Caption 'SE.' is on screen for only 0.49 s — less than half the 0.9 s minimum. At under half a second this single-syllable trailing word appears and disappears faster than most viewers can consciously register it as a distinct caption card. → Merge 'SE.' back into the preceding card so 'ASLI ASTRONOMICAL DATA SE.' reads as one 2.28 s caption (10.59-12.91s), eliminating the flash-cut fragment entirely.
- [12.8-15.6s] s4 spoken line is 8 words in a 2.8s rendered shot (2.86 wps vs 2.3 limit). Script was authored for 4s but Veo generated only 2.8s — 'Pitch se pehle apna din dekho - free hai' will either be rushed or the tail gets clipped before 'free hai' lands. → Either trim s4 script to ≤6 words (e.g. 'Apna din dekho — free hai.') to fit the 2.8s window, or re-request a 4s Veo clip to match the authored duration.
- [0.0-2.7s] Hook text 'Same pitch. Do alag / windows.' in amber drop-shadow sits directly over the presenter's near-white blown-out face/forehead (strong backlight visible in frame 01; lens flare top-right in frame 02). The drop shadow is thin. Against that near-white background the hook reads weakly at phone-arm-length distance, especially in bright ambient conditions. This is the highest-stakes typography m → Add a semi-transparent dark radial scrim behind the hook text, or reposition it to the lower-thirds where the presenter's mid-gray shirt provides a neutral backing. Alternatively, significantly increase the stroke/shadow weight so the text passes contrast against near-white.
- [n/a] VEDICHOUR wordmark burns in at approximately 100-110 px from the top of the 1920 px frame (visible in every frame including the dark letterbox in frames 01-03 and the thin strip in frames 09-10). Instagram Reels and TikTok UI (progress bar, camera-switch button, back arrow) occupies roughly 150-180 px from the top. The brand identifier sits inside that unsafe zone and will be partially or fully oc → Move the wordmark down to at least y=200 px (≈10.4 % from top) so it clears platform UI on all target surfaces.
- [0.5-2.1s] Hook text 'Same pitch. Do alag windows.' is positioned mid-frame against a blown-out overexposed background in frames 01 and 02. The text has a shadow but the background behind 'Do alag' is nearly white — contrast drops below reliable legibility on a bright phone screen in sunlight. First 1s must be bulletproof. → Add a semi-transparent dark scrim (20-30% opacity black rect) behind the hook text only, or increase the shadow spread on the caption renderer for the Hook style.
- [3.85-4.70s] Caption 'HAI - KAUNSA' is on screen for 0.85 s, just under the 0.9 s minimum for a 3-word phrase. → Extend this card to 0.9 s by absorbing 0.05 s from the gap before the next caption, or merge it forward with 'BAS WINDOW ALAG'.
- [5.4s] Frame 04 shows the product section opening mid-transition: the dark navy hero occupies the upper half and the light parchment report body the lower half, creating a visually split frame rather than a clean opening composition. The viewer's first look at the report is a page caught between two sections. → Delay the scroll-start of the capture by 0.4–0.6s so the first stable frame lands on the 'Monday · Bangalore' day card rather than mid-hero-exit.
- [6.31-7.18s] Caption 'KA SCORE, EK' is on screen for 0.87 s, just under the 0.9 s minimum for a 3-word phrase. → Extend to 0.9 s by taking 0.03 s from the gap between this and the following caption.
- [7.0s] The legend "Strong 80–100", "Favourable 60–79", and "Mixed 40–59" uses pale green, yellow, and pink text on white; parts are too low-contrast at phone size. → Use darker text colors meeting at least 4.5:1 contrast and slightly increase the legend font weight.
- [9.5-10.5s] 1.00s of dead air mid-reel — short-form viewers drop on silence. → Tighten the shot transition or duck a licensed music bed under the gap (media/music/).
- [13.0-15.6s] CTA band packs three lines of text — 'vedichour.com – free chart. Your Life, Decoded Hour by Hour.' — into a 2.6s window. The URL, the offer word ('free chart'), and the tagline compete for one read. On first watch the viewer is also hearing the presenter talk. The tagline 'Your Life, Decoded Hour by Hour' will not register. → Strip the tagline from the CtaBand; show only 'vedichour.com — free chart'. Tagline is already in the brand watermark at top. Two lines in 2.6s is comfortable; three is not.
- [13.0-15.6s] CtaBand ('vedichour.com - free / chart. Your Life, Decoded / Hour by Hour.') is positioned mid-frame at approximately 55 % from the top — sitting over the presenter's torso rather than anchored to the lower third. CTAs positioned mid-body read as caption content, not as an action prompt. Additionally the CtaBand uses mixed case while all body captions are ALL CAPS, which is a style break even if i → Anchor the CtaBand so its bottom edge sits no lower than 320 px from the bottom of the 1920 px frame (i.e. top edge ≈ y 1450 px). If mixed case is deliberate for URL readability, document it as the CtaBand style rule so it does not look accidental.
- [2.1s] Frame 02 shows a warm orange/golden light bloom bleeding into the top-right corner of the black letterbox bar — the Veo background window light clipping through what should be a solid brand bar. → Mask the letterbox bars to a fully opaque solid fill (not a crop-based overlay) so no video layer can bleed through.
- [13.0-15.6s] s4 spoken line 'Pitch se pehle apna din dekho - free hai' carries zero captions — the CtaBand text replaces them. A viewer watching silently misses the narrative CTA entirely and sees only 'vedichour.com - free chart' which is a URL, not a motivating line. → Add a caption line for s4's spoken text in the 0.2s before the CtaBand, or rewrite s4 so the spoken line and the CtaBand text match word-for-word.
- [0-5.2s] s1 has 12 words in 5.2s (2.31 wps, limit 2.3). A silence of 0.82s at 0.7–1.5s means the presenter is actually speaking for ~4.4s, pushing effective rate to ~2.74 wps. Playback will confirm whether it sounds natural or clipped. → If playback sounds fine, accept. If hurried: drop 'Client same hai.' — 'Deck same hai. Bas window alag hai — kaunsa lun?' is 9 words and fits easily.

## Owner decision

```
npm run approvals                       # see everything waiting
npm run approve 2026-07-26-same-pitch-do-alag-windows-v2
npm run reject  2026-07-26-same-pitch-do-alag-windows-v2 "why it is wrong"
```

A rejection is filed as a lesson so the same mistake cannot come back.

_Generated 2026-07-26T15:42:45.803Z · run ac290dc7_