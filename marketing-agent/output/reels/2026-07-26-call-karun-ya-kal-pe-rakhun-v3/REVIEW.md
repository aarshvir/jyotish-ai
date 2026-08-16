# REVIEW — 2026-07-26-call-karun-ya-kal-pe-rakhun-v3

## VERDICT

```
VERDICT: BLOCK
REASON:  5 blocker-severity finding(s); 5 lens(es) returned "block" (1. first-second scroll-stop, 2. visual believability / AI tells, 3. on-screen text & caption legibility, 4. voice & audio naturalness, 5. does the product prove the promise)
REEL:    2026-07-26-call-karun-ya-kal-pe-rakhun-v3 · 15.8s · 1080x1920
PASSES:  11 (4 internal · 5 GPT cross-review · 2 deterministic)
FINDINGS: 5 blocker · 13 major · 4 minor · 2 nit
COST:    $0.0000 (CLI subscriptions are $0; only the paid fallback bills)
STATUS:  awaiting owner approval — nothing publishes until `npm run approve 2026-07-26-call-karun-ya-kal-pe-rakhun-v3`
```

## Passes

| lens | stage | by | verdict | one-liner |
|---|---|---|---|---|
| a. ad-craft / hook | internal | claude | **SHIP WITH NOTES** | Hook and payoff are surgically matched; one 1.3s dead silence before 4s is the only meaningful drop-off risk. |
| b. script & voice | internal | claude | **SHIP WITH NOTES** | Voice is clean throughout; closing CTA is rushed at 2.86 WPS and risks losing 'free hai'. |
| c. typography / captions | internal | claude | **SHIP WITH NOTES** | Wordmark buried in platform UI zone and hook's 'ya kal' is illegible against the blown-out warm background. |
| d. motion / pacing / on-screen | internal | claude | **SHIP WITH NOTES** | No pricing pages, clean proof-of-claim scroll, one cross-clip presenter face drift is the only real defect. |
| 1. first-second scroll-stop | gpt | codex | **BLOCK** | 4/10 stop-power: relatable hook, but generic AI talking-head and face-obscuring text give no instant reason to stay. |
| 2. visual believability / AI tells | gpt | codex | **BLOCK** | Block: the fused gesture hand and changing kurta construction visibly betray separate AI generations. |
| 3. on-screen text & caption legibility | gpt | codex | **BLOCK** | Block: the product capture contains a misspelling, unexplained astrology jargon, clipped page text, and low-contrast score labels. |
| 4. voice & audio naturalness | gpt | codex | **BLOCK** | Block: the hook hits 1.31s of dead air, and the closing line is over-compressed. |
| 5. does the product prove the promise | gpt | codex | **BLOCK** | Block: the footage proves three evening windows, not a whole day of scored, explained hour-windows. |
| hard-rules (deterministic) | deterministic | regex | **SHIP WITH NOTES** | 1 measurable defect(s), none blocking. |
| pre-flight (retro, on the creative plan) | deterministic | rules | **SHIP** | The plan this reel came from passes pre-flight. |

## Findings


### BLOCKER

- **[0.5s]** The viewer sees a generic AI-stock-style man in a kurta, seated in a warm room with a cropped phone and blown-out window. Nothing visually signals astrology, timing, or a surprising answer, so the shot is immediately swipeable.
  - **fix:** Open result-first: show the report’s “5–6 pm · Strong · 98” beside “7–8 pm · Mixed · 49,” with “CALL KAB KARUN?” in bold high-contrast type; make the presenter secondary.
  - _auto-fixable ($0 re-assembly) · raised by: 1. first-second scroll-stop_
- **[2.39-3.69s]** A 1.31s dead-air gap breaks the hook before “Do din se…”, creating a conspicuous pause at the highest-drop-off moment.
  - **fix:** Remove roughly 0.8-1.0s so the next line begins within 0.3-0.5s of the question.
  - _auto-fixable ($0 re-assembly) · raised by: 4. voice & audio naturalness_
- **[3.8s]** The foreground gesturing hand resolves into two smooth, fused lobes with no believable separation of the fingers, exposing the AI-generated presenter footage.
  - **fix:** Replace this presenter segment with a take showing a fully formed hand, or crop the gesture completely out of frame.
  - _needs re-render (costs money) · raised by: 2. visual believability / AI tells_
- **[5.4s]** The product-page label "Moon in Scorpio · Jyesththa" contains the misspelling "Jyesththa"; the standard spelling is "Jyeshtha."
  - **fix:** Correct the product page to "Moon in Scorpio · Jyeshtha" and recapture the report.
  - _auto-fixable ($0 re-assembly) · raised by: 3. on-screen text & caption legibility_
- **[8.7-12.0s]** The footage proves only an evening subset, not the promised whole day: 8.7s shows 5–6 pm Strong 98 with hard-conversation guidance, 6–7 pm Strong 83 with wrap-up guidance, and part of 7–8 pm; 10.4s shows complete 6–7 pm and 7–8 pm Mixed 49 guidance; 12.0s repeats those and exposes only the 8–9 pm Mixed 57 header. No morning or daytime windows appear, so viewers never see a whole day of rated hour-
  - **fix:** Replace the capture with a readable whole-day overview showing all 18 time windows and scores, then hold on complete representative cards so their plain-English guidance can be read.
  - _auto-fixable ($0 re-assembly) · raised by: 5. does the product prove the promise_

### MAJOR

- **[0.5-2.1s]** Hook caption line 1 ('Call karun... ya kal') has 'ya kal' landing on the blown-out warm-yellow backlit window at the upper-right of the presenter frame. Text is amber/gold with no background scrim or visible text shadow; the hue matches the background almost exactly. At phone arm's length 'ya kal' is illegible — the viewer reads 'Call karun...' and loses the second half of the dilemma.
  - **fix:** Add a semi-transparent dark scrim (e.g. rgba(0,0,0,0.45)) behind the hook text block, or increase the drop-shadow radius to at least 8px offset 4px spread; alternatively, reflow the hook to a single centred line so it falls over the darker area of the frame rather than spilling right into the highlight.
  - _auto-fixable ($0 re-assembly) · raised by: c. typography / captions_
- **[0.5s]** The long beige serif hook sits directly across the presenter’s eyes on uneven light, weakening both facial connection and instant readability.
  - **fix:** Replace it with a shorter sans-serif hook such as “CALL AAJ KARUN?” placed on a solid high-contrast band away from the eyes.
  - _auto-fixable ($0 re-assembly) · raised by: 1. first-second scroll-stop_
- **[0.5-2.0s]** The opening remains essentially the same talking-head composition through 2.0s, confirmed by the nearly unchanged 2.1s frame; there is no visual reveal, answer teaser, or pattern interrupt within the hostile-scroller window.
  - **fix:** Reveal the recommended hour or animate an immediate NOW-versus-LATER comparison within the first 0.8s.
  - _auto-fixable ($0 re-assembly) · raised by: 1. first-second scroll-stop_
- **[2.4-3.7s]** 1.3s confirmed dead silence (ffmpeg: silence_start 2.39s, silence_end 3.69s) with zero new visual information — frame 02 shows the hook caption frozen on screen with only a small emoji added. No motion, no cut, no audio. This is the highest drop-off window in a short-form reel; a viewer who just heard the hook question has no signal to stay through 1.3s of nothing.
  - **fix:** Trim the pause between 'ya kal pe rakhun?' and 'Do din se' to ≤0.4s in the next render. Alternatively, add a visible beat at 2.4s — a caption word flash, a quick cut, or a motion cue — to carry the eye through the audio gap without re-rendering.
  - _auto-fixable ($0 re-assembly) · raised by: a. ad-craft / hook_
- **[5.4s]** The fixed navy header clips a white product-page line immediately above "Every hour scored...", leaving detached, unreadable letter fragments at the gold boundary.
  - **fix:** Reframe the page or add sufficient top padding so no product text passes beneath the fixed header.
  - _advisory · raised by: 3. on-screen text & caption legibility_
- **[5.4-7.1s]** The captured page prominently shows unexplained astrology jargon: "ruling planets," "Cancer rising," and "Moon in Scorpio · Jyesththa." A general Indian professional cannot infer their practical meaning.
  - **fix:** Remove these details from the capture or replace them with plain-language context relevant to the hourly recommendation.
  - _auto-fixable ($0 re-assembly) · raised by: 3. on-screen text & caption legibility_
- **[5.4-7.1s]** As “HAR GHANTE KA SCORE” is promised, the sample-report screen shows birth details, “Monday · Bangalore,” one aggregate “Favourable day 70” score, a short day summary, and the score-colour legend—not hourly scored windows.
  - **fix:** Start this passage on the hourly-results section, with multiple complete time-window cards and their scores visible.
  - _advisory · raised by: 5. does the product prove the promise_
- **[7.1s]** The score legend text "Favourable 60–79" and "Mixed 40–59" uses very pale green, yellow, and mauve on white; especially the number ranges are unreadable at phone size.
  - **fix:** Use substantially darker text colors meeting mobile contrast requirements.
  - _auto-fixable ($0 re-assembly) · raised by: 3. on-screen text & caption legibility_
- **[13.0-15.8s]** s4 closing CTA runs at 2.86 WPS (8 words in 2.8s), 24% over the 2.3 WPS hard limit. 'Call se pehle apna din dekho - free hai.' is the only call-to-action in the reel; at this pace 'free hai' risks sounding clipped and the viewer may miss it.
  - **fix:** Trim the line by two words: 'Apna din dekho - free hai.' (6 words, 2.14 WPS) or extend s4 to at least 3.5s in the next render pass.
  - _auto-fixable ($0 re-assembly) · raised by: b. script & voice_
- **[13.0-15.8s]** Presenter in s4 (frames 09–10) has visibly softer, rounder facial features and a meaningfully different nose shape versus s1 (frames 01–02). Same navy kurta and haircut, but the face structure has drifted far enough that a careful viewer senses 'slightly different person at the end.' Classic Veo cross-clip identity drift. Frame 01: sharp jawline, prominent angular nose, deep-set eyes. Frame 09: ro
  - **fix:** Regenerate s4 referencing a face crop from s1 (pass it as Veo's character reference image), or accept the drift if the owner's read at 1× speed makes it undetectable.
  - _needs re-render (costs money) · raised by: d. motion / pacing / on-screen_
- **[13.0-15.8s]** The nine-word closing line has only 2.8s versus the scripted 4s, making a rushed delivery or clipped ending likely.
  - **fix:** Extend the closing shot to about 4s, or shorten the spoken line to “Call se pehle apna din dekho.”
  - _auto-fixable ($0 re-assembly) · raised by: 4. voice & audio naturalness_
- **[13.7-15.3s]** The presenter's kurta changes from the raised band collar and pale buttons seen at 0.5-3.8s to a round split neckline with metallic ring buttons, revealing cross-shot generation inconsistency.
  - **fix:** Regenerate the closing shot using the opening shot as a wardrobe reference, matching the collar, placket, and buttons exactly; alternatively crop above the neckline.
  - _needs re-render (costs money) · raised by: 2. visual believability / AI tells_
- **[0.0-15.8s]** VEDICHOUR burned-in wordmark sits at approximately y≈100px from the top of the 1920px frame across every shot — presenter and product alike. Instagram Reels overlays the account name and navigation UI over roughly the top 150–180px; the wordmark is inside that dead zone on every impression and will be covered by the platform chrome.
  - **fix:** Move the wordmark down to y≥220px (roughly 11% from top) so it clears the Instagram/TikTok UI on all aspect-ratio variants.
  - _auto-fixable ($0 re-assembly) · raised by: c. typography / captions_

### MINOR

- **[2.4-3.7s]** 1.31s of dead air mid-reel — short-form viewers drop on silence.
  - **fix:** Tighten the shot transition or duck a licensed music bed under the gap (media/music/).
  - _auto-fixable ($0 re-assembly) · raised by: hard-rules_
- **[2.99-3.65s]** 'DO DIN SE' caption is on screen for 0.66s — three uppercase words below the 0.9s minimum-readability floor.
  - **fix:** Extend the caption end time to at least 3.90s (0.91s duration).
  - _auto-fixable ($0 re-assembly) · raised by: c. typography / captions_
- **[8.7-12.0s]** The product cards repeatedly show unexplained labels "Mars hour," "Sun hour," and "Venus hour," which are astrology jargon without a plain-language explanation.
  - **fix:** Hide the planet-hour labels in this capture or add a short plain-language explanation.
  - _auto-fixable ($0 re-assembly) · raised by: 3. on-screen text & caption legibility_
- **[13.2-15.8s]** On-screen CTA reads 'vedichour.com – free chart. Your Life, Decoded Hour by Hour.' — 'free chart' is a noun phrase, not an action. The spoken line ('Call se pehle apna din dekho - free hai') is more directive but disappears with the audio. A viewer watching on mute sees only a URL and a noun and must infer 'go there.'
  - **fix:** Change the written CTA line to 'vedichour.com — free chart banao' or 'Dekho: vedichour.com — free hai' so the action is explicit on-screen independent of audio.
  - _advisory · raised by: a. ad-craft / hook_

### NIT

- **[2.99-3.65s]** Caption 'DO DIN SE' is on screen for only 0.66s, entirely within the 1.3s audio silence (2.39–3.69s), meaning the presenter is not audibly saying these words when the caption shows. It appears, then disappears, in near-silence before 'YEHI SAWAAL HAI.' begins at 3.69s. Not unreadable, but the word-to-audio sync contract breaks briefly.
  - **fix:** Shift 'DO DIN SE' caption start to align with the end of the silence (≈3.69s) and extend it to 1.0s, so it flashes right as the presenter says the words rather than during the pause.
  - _auto-fixable ($0 re-assembly) · raised by: d. motion / pacing / on-screen_
- **[9.8-10.7s]** Second silence of 0.9s (ffmpeg: silence_start 9.84s, silence_end 10.73s) falls mid-product-shot while caption reads 'THEEK HAI. ASLI'. Less critical — the product frames carry this visually — but creates an uneven rhythm during the proof section.
  - **fix:** Trim or bridge the audio gap in the edit. Acceptable to leave if the fix cost exceeds value — the visual is doing real work here.
  - _auto-fixable ($0 re-assembly) · raised by: a. ad-craft / hook_

## Fix queue (auto-fixable, $0)

The render/assembly path can consume these without spending anything (also in `fix_queue.json` and the `fix_queue` table):

- [0.5s] The viewer sees a generic AI-stock-style man in a kurta, seated in a warm room with a cropped phone and blown-out window. Nothing visually signals astrology, timing, or a surprising answer, so the shot is immediately swipeable. → Open result-first: show the report’s “5–6 pm · Strong · 98” beside “7–8 pm · Mixed · 49,” with “CALL KAB KARUN?” in bold high-contrast type; make the presenter secondary.
- [2.39-3.69s] A 1.31s dead-air gap breaks the hook before “Do din se…”, creating a conspicuous pause at the highest-drop-off moment. → Remove roughly 0.8-1.0s so the next line begins within 0.3-0.5s of the question.
- [5.4s] The product-page label "Moon in Scorpio · Jyesththa" contains the misspelling "Jyesththa"; the standard spelling is "Jyeshtha." → Correct the product page to "Moon in Scorpio · Jyeshtha" and recapture the report.
- [8.7-12.0s] The footage proves only an evening subset, not the promised whole day: 8.7s shows 5–6 pm Strong 98 with hard-conversation guidance, 6–7 pm Strong 83 with wrap-up guidance, and part of 7–8 pm; 10.4s shows complete 6–7 pm and 7–8 pm Mixed 49 guidance; 12.0s repeats those and exposes only the 8–9 pm Mixed 57 header. No morning or daytime windows appear, so viewers never see a whole day of rated hour- → Replace the capture with a readable whole-day overview showing all 18 time windows and scores, then hold on complete representative cards so their plain-English guidance can be read.
- [0.5-2.1s] Hook caption line 1 ('Call karun... ya kal') has 'ya kal' landing on the blown-out warm-yellow backlit window at the upper-right of the presenter frame. Text is amber/gold with no background scrim or visible text shadow; the hue matches the background almost exactly. At phone arm's length 'ya kal' is illegible — the viewer reads 'Call karun...' and loses the second half of the dilemma. → Add a semi-transparent dark scrim (e.g. rgba(0,0,0,0.45)) behind the hook text block, or increase the drop-shadow radius to at least 8px offset 4px spread; alternatively, reflow the hook to a single centred line so it falls over the darker area of the frame rather than spilling right into the highlight.
- [0.5s] The long beige serif hook sits directly across the presenter’s eyes on uneven light, weakening both facial connection and instant readability. → Replace it with a shorter sans-serif hook such as “CALL AAJ KARUN?” placed on a solid high-contrast band away from the eyes.
- [0.5-2.0s] The opening remains essentially the same talking-head composition through 2.0s, confirmed by the nearly unchanged 2.1s frame; there is no visual reveal, answer teaser, or pattern interrupt within the hostile-scroller window. → Reveal the recommended hour or animate an immediate NOW-versus-LATER comparison within the first 0.8s.
- [2.4-3.7s] 1.3s confirmed dead silence (ffmpeg: silence_start 2.39s, silence_end 3.69s) with zero new visual information — frame 02 shows the hook caption frozen on screen with only a small emoji added. No motion, no cut, no audio. This is the highest drop-off window in a short-form reel; a viewer who just heard the hook question has no signal to stay through 1.3s of nothing. → Trim the pause between 'ya kal pe rakhun?' and 'Do din se' to ≤0.4s in the next render. Alternatively, add a visible beat at 2.4s — a caption word flash, a quick cut, or a motion cue — to carry the eye through the audio gap without re-rendering.
- [5.4-7.1s] The captured page prominently shows unexplained astrology jargon: "ruling planets," "Cancer rising," and "Moon in Scorpio · Jyesththa." A general Indian professional cannot infer their practical meaning. → Remove these details from the capture or replace them with plain-language context relevant to the hourly recommendation.
- [7.1s] The score legend text "Favourable 60–79" and "Mixed 40–59" uses very pale green, yellow, and mauve on white; especially the number ranges are unreadable at phone size. → Use substantially darker text colors meeting mobile contrast requirements.
- [13.0-15.8s] s4 closing CTA runs at 2.86 WPS (8 words in 2.8s), 24% over the 2.3 WPS hard limit. 'Call se pehle apna din dekho - free hai.' is the only call-to-action in the reel; at this pace 'free hai' risks sounding clipped and the viewer may miss it. → Trim the line by two words: 'Apna din dekho - free hai.' (6 words, 2.14 WPS) or extend s4 to at least 3.5s in the next render pass.
- [13.0-15.8s] The nine-word closing line has only 2.8s versus the scripted 4s, making a rushed delivery or clipped ending likely. → Extend the closing shot to about 4s, or shorten the spoken line to “Call se pehle apna din dekho.”
- [0.0-15.8s] VEDICHOUR burned-in wordmark sits at approximately y≈100px from the top of the 1920px frame across every shot — presenter and product alike. Instagram Reels overlays the account name and navigation UI over roughly the top 150–180px; the wordmark is inside that dead zone on every impression and will be covered by the platform chrome. → Move the wordmark down to y≥220px (roughly 11% from top) so it clears the Instagram/TikTok UI on all aspect-ratio variants.
- [2.4-3.7s] 1.31s of dead air mid-reel — short-form viewers drop on silence. → Tighten the shot transition or duck a licensed music bed under the gap (media/music/).
- [2.99-3.65s] 'DO DIN SE' caption is on screen for 0.66s — three uppercase words below the 0.9s minimum-readability floor. → Extend the caption end time to at least 3.90s (0.91s duration).
- [8.7-12.0s] The product cards repeatedly show unexplained labels "Mars hour," "Sun hour," and "Venus hour," which are astrology jargon without a plain-language explanation. → Hide the planet-hour labels in this capture or add a short plain-language explanation.
- [2.99-3.65s] Caption 'DO DIN SE' is on screen for only 0.66s, entirely within the 1.3s audio silence (2.39–3.69s), meaning the presenter is not audibly saying these words when the caption shows. It appears, then disappears, in near-silence before 'YEHI SAWAAL HAI.' begins at 3.69s. Not unreadable, but the word-to-audio sync contract breaks briefly. → Shift 'DO DIN SE' caption start to align with the end of the silence (≈3.69s) and extend it to 1.0s, so it flashes right as the presenter says the words rather than during the pause.
- [9.8-10.7s] Second silence of 0.9s (ffmpeg: silence_start 9.84s, silence_end 10.73s) falls mid-product-shot while caption reads 'THEEK HAI. ASLI'. Less critical — the product frames carry this visually — but creates an uneven rhythm during the proof section. → Trim or bridge the audio gap in the edit. Acceptable to leave if the fix cost exceeds value — the visual is doing real work here.

## Owner decision

```
npm run approvals                       # see everything waiting
npm run approve 2026-07-26-call-karun-ya-kal-pe-rakhun-v3
npm run reject  2026-07-26-call-karun-ya-kal-pe-rakhun-v3 "why it is wrong"
```

A rejection is filed as a lesson so the same mistake cannot come back.

_Generated 2026-07-26T15:34:46.286Z · run 65208dcb_