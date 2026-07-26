# REVIEW — 2026-07-25-hr-ne-do-slots-bheje-v2

## VERDICT

```
VERDICT: BLOCK
REASON:  27 blocker-severity finding(s); 10 lens(es) returned "block" (a. ad-craft / hook, b. script & voice, d. motion / pacing / on-screen, 1. first-second scroll-stop, 2. visual believability / AI tells, 3. on-screen text & caption legibility, 4. voice & audio naturalness, 5. does the product prove the promise, hard-rules (deterministic), pre-flight (retro, on the creative plan))
REEL:    2026-07-25-hr-ne-do-slots-bheje-v2 · 33.4s · 1080x1920
PASSES:  11 (4 internal · 5 GPT cross-review · 2 deterministic)
FINDINGS: 27 blocker · 23 major · 9 minor · 1 nit
COST:    $0.0000 (CLI subscriptions are $0; only the paid fallback bills)
STATUS:  awaiting owner approval — nothing publishes until `npm run approve 2026-07-25-hr-ne-do-slots-bheje-v2`
```

## Passes

| lens | stage | by | verdict | one-liner |
|---|---|---|---|---|
| a. ad-craft / hook | internal | codex | **BLOCK** | Block: the reel teases a 10-vs-5 decision, then abandons timing proof for an unrelated Kundli screen and weak CTA. |
| b. script & voice | internal | claude | **BLOCK** | Blocked: banned en-IN-NeerjaNeural TTS voice and a hard voice-switch at 6s are both owner hard-rule violations. |
| c. typography / captions | internal | cli | **DEGRADED** | PASS FAILED — brain(tier=smart) — all CLIs failed: · claude: ERROR — claude timed out after 180000ms · codex: ERROR — codex timed out after 180000ms · gemini: disabled/unavai |
| d. motion / pacing / on-screen | internal | claude | **BLOCK** | Block: banned voice, Swiss Ephemeris visible twice, Vimshottari on screen, s4 is a signup form not the report. |
| 1. first-second scroll-stop | gpt | codex | **BLOCK** | 3/10 stop-power: generic phone footage and a vague hook hide the actual 10 AM-versus-5 PM dilemma. |
| 2. visual believability / AI tells | gpt | codex | **BLOCK** | Block: the presenter's hair visibly morphs, exposing the AI-generated opening shot. |
| 3. on-screen text & caption legibility | gpt | codex | **BLOCK** | Block: banned jargon and repeated text collisions make this reel unpublishable. |
| 4. voice & audio naturalness | gpt | codex | **BLOCK** | Block: synthetic Neerja VO, a 6.0s voice switch, and repeated dead air violate the audio standard. |
| 5. does the product prove the promise | gpt | codex | **BLOCK** | Block: sample marketing excerpts never demonstrate the promised 18-window report and opened Hora guidance. |
| hard-rules (deterministic) | deterministic | regex | **BLOCK** | 2 owner hard-rule violation(s) proven from the artifacts. |
| pre-flight (retro, on the creative plan) | deterministic | rules | **BLOCK** | The plan this reel came from would be BLOCKED today: 7 hard-rule violation(s). |

> **Degraded passes** (their silence is not a pass):
> - c. typography / captions: brain(tier=smart) — all CLIs failed: · claude: ERROR — claude timed out after 180000ms · codex: ERROR — codex timed out after 180000ms · gemini: disabled/unavailable

## Findings


### BLOCKER

- **[0.5-4.1s]** Within the same continuous presenter shot, the hair changes from a textured, side-swept style at 0.5s into a smooth, blunt, helmet-like mass at 4.1s. This temporal morph exposes the footage as AI-generated.
  - **fix:** Replace the entire 0-6s presenter shot with real footage or regenerate it with a temporally stable face and hairstyle, then audit multiple consecutive frames.
  - _needs re-render (costs money) · raised by: 2. visual believability / AI tells_
- **[6.0s]** Voice/timbre switch at the s1→s2 boundary: presenter speaks in their own Veo-native in-shot voice for s1 (0–6s), then en-IN-NeerjaNeural takes over as narrator for all of s2–s4. Two distinct voices in one reel.
  - **fix:** Same fix as the voice-id blocker above — the reel must be single-voice throughout. Either the presenter delivers every line on camera, or all VO uses one approved voice from start to finish.
  - _needs re-render (costs money) · raised by: b. script & voice_
- **[6.0s]** The presenter's native in-shot voice hands over to a different voice at the s1-to-s2 boundary; the configured VO is en-IN-NeerjaNeural.
  - **fix:** Use one consistent human voice throughout—preferably the presenter recording every VO line with matched mic, room tone, EQ, and level.
  - _needs re-render (costs money) · raised by: 4. voice & audio naturalness_
- **[6s]** VOICE SWITCH: the reel opens on the presenter's native in-shot voice and then hands over to a separate synthetic narrator (3 narrated shot(s), voice "en-IN-NeerjaNeural"). Two different voices in one reel.
  - **fix:** Rewrite so the presenter speaks the lines on camera (Veo native audio) — CLAUDE.md §2: eliminating narration is cheaper AND better than buying better TTS.
  - _needs re-render (costs money) · raised by: hard-rules_
- **[6.28-31.36s]** All post-hook narration uses en-IN-NeerjaNeural, an explicitly synthetic voice that violates the owner hard rule.
  - **fix:** Replace the entire generated narration track with a natural human recording; do not substitute another Neural or edge-tts voice.
  - _needs re-render (costs money) · raised by: 4. voice & audio naturalness_
- **[7.7s]** Homepage badge pill reads 'CLASSICAL VEDIC SYSTEM · AI-POWERED · SWISS EPHEMERIS PRECISION' — white-on-dark, fully legible on screen at the moment caption 'REPLY TYPE KARKE' appears. 'swiss ephemeris' is on the banned-jargon list (project law §1, pre-flight gate).
  - **fix:** Crop homepage capture so the badge pill is off-frame (start scroll below it), or replace s2 entirely with a shot of the actual hora-grid report page.
  - _auto-fixable ($0 re-assembly) · raised by: d. motion / pacing / on-screen_
- **[7.7s]** The captured page visibly says “SWISS EPHEMERIS PRECISION.” “Swiss Ephemeris” is explicitly banned jargon.
  - **fix:** Replace or recapture this page section with jargon-free copy such as “precise astronomical calculations.”
  - _auto-fixable ($0 re-assembly) · raised by: 3. on-screen text & caption legibility_
- **[9.3-24.5s]** The claimed proof is not demonstrated: narration says Interview was selected, an 18-hour grid appeared, and a Hora card was opened, but the audited frames show report excerpts, Life Chapters, and Dosha Check instead. At 18.5s and 22.1s, captions about window context sit over unrelated Life Chapters/Dosha content.
  - **fix:** Show the actual sequence on screen: select Interview, reveal the 18-hour grid, compare 10 AM with 5 PM, then open the relevant Hora card.
  - _auto-fixable ($0 re-assembly) · raised by: a. ad-craft / hook_
- **[11.3-14.9s]** The footage shows a marketing/sample-excerpts page, headed "Three excerpts computed from a real sample chart." Its "Hourly Windows" excerpt names 17:00–18:00 as 98/100 and 12:00–13:00 for routine work, plus the label "18 rated slots." It never shows Interview being selected, the promised whole-day 18-window grid, multiple rated windows, or a Hora card being opened. The label claims the feature; it
  - **fix:** Replace this section with an actual report recording: show Interview selected, hold on the complete 18-window rated grid long enough to read several times and ratings, then visibly tap one Hora card.
  - _auto-fixable ($0 re-assembly) · raised by: 5. does the product prove the promise_
- **[14.9s–22.1s]** The LIFE CHAPTERS card metadata footer reads 'Vimshottari dasha · Sun period active' — white monospace text, clearly legible in the frames at 14.9s, 18.5s, and 22.1s across approximately 7 seconds of screen time. 'vimshottari' is explicitly on the banned-jargon list (project law §1).
  - **fix:** Crop the product scroll so the card metadata row is never in frame, or suppress this label in the product UI before screen-capturing.
  - _auto-fixable ($0 re-assembly) · raised by: d. motion / pacing / on-screen_
- **[14.9-22.1s]** The report card visibly says “Vimshottari dasha · Sun period active” in frames at 14.9s, 18.5s and 22.1s. “Vimshottari” is explicitly banned.
  - **fix:** Remove this card from the capture or replace its footer with plain language such as “Current life phase: Sun period.”
  - _auto-fixable ($0 re-assembly) · raised by: 3. on-screen text & caption legibility_
- **[18.5-22.1s]** During the exact plain-English-guidance promise, the relevant Hourly Windows excerpt scrolls offscreen. At 18.5s its final line and "18 rated slots" remain partially visible, while "Life Chapters" and "Dosha Check" dominate; at 22.1s only those unrelated birth-chart sections are readable. No opened window explains what that hour suits.
  - **fix:** Keep the opened Hora card onscreen throughout this narration and show legible plain-English suitability guidance tied to its specific time and rating.
  - _auto-fixable ($0 re-assembly) · raised by: 5. does the product prove the promise_
- **[24.5-30.8s]** The proof beat ends at 24.5s and is replaced for 6.3s by a Free Janam Kundli page. At 25.7s and 29.3s, the dominant offer is birth-chart generation, so a one-watch viewer can reasonably conclude VedicHour is a Kundli generator rather than an hourly timing app.
  - **fix:** Remove the Kundli shot and continue showing the interview timing grid or Hora-card result through the CTA.
  - _auto-fixable ($0 re-assembly) · raised by: a. ad-craft / hook_
- **[24.5s–33.4s]** s4 is an empty birth-data input form (free-kundli hero page), not the report. Owner rule: product shots show THE REPORT (hour-slots + plain-English 'what this window suits' text). The s4 narration claims '18 planetary hours ek grid mein / hora card' — but the screen shows an empty dd/mm/yyyy date picker, which proves nothing and contradicts the audio claim.
  - **fix:** Replace s4 with a scroll of the actual report showing the hora-grid or a hora card with its plain-English context text. The free-kundli input page is never an appropriate ad product shot.
  - _auto-fixable ($0 re-assembly) · raised by: d. motion / pacing / on-screen_
- **[25.7s–33.4s]** s4 shows the free-kundli page (/free-kundli) whose body text reads 'we cast your sidereal chart with the Swiss Ephemeris' — both 'swiss ephemeris' and 'sidereal' are fully legible in frames at 25.7s and 29.3s. Two banned jargon words in large body text, on screen for 8.9s.
  - **fix:** Replace s4 entirely with a shot of the hora-grid report. This also resolves finding below — the free-kundli form itself is not the report.
  - _auto-fixable ($0 re-assembly) · raised by: d. motion / pacing / on-screen_
- **[25.7-32.9s]** The product-page sentence visibly contains both banned terms: “we cast your sidereal chart with the Swiss Ephemeris.” It appears at 25.7s and is fully readable at 29.3s and 32.9s.
  - **fix:** Rewrite the live page copy and recapture it, or use a crop that completely excludes this sentence.
  - _auto-fixable ($0 re-assembly) · raised by: 3. on-screen text & caption legibility_
- **[n/a]** Configured narration voice is en-IN-NeerjaNeural — an explicit *Neural / 'Neerja' voice that is banned under the owner's hard rule. Every VO line in s2–s4 (6–33.4s) is delivered by this synthetic voice.
  - **fix:** Re-narrate all VO using Sarvam Bulbul v3 male, or rewrite s2–s4 so the presenter delivers those lines on camera in Veo-native voice, removing VO entirely.
  - _needs re-render (costs money) · raised by: b. script & voice_
- **[n/a]** Narration voice is en-IN-NeerjaNeural — explicitly named as banned in project law: 'Never edge-tts / en-IN-NeerjaNeural in an ad — it reads as synthetic.' Every VO line in s2, s3, and s4 is affected.
  - **fix:** Replace all VO with on-camera presenter delivery (cheapest, zero extra cost) or re-render with approved Sarvam Bulbul v3 male voice. NeerjaNeural must not appear in any published reel.
  - _needs re-render (costs money) · raised by: d. motion / pacing / on-screen_
- **[0.0-2.0s]** At 0.5s, viewers see generic stock-feeling café footage: a passive man looking down at his phone, with no eye contact, reaction, message UI, or visible decision tension. The vague hook “HR ne do slots bheje” withholds the compelling 10 AM-versus-5 PM dilemma beyond the hostile 0.8-second attention window, giving viewers no reason to stay.
  - **fix:** Open on a tight HR-message visual showing “10 AM or 5 PM?” immediately, paired with a visible reaction and the high-contrast hook “Interview: 10 AM ya 5 PM—kaunsa?” on screen by 0.2s.
  - _auto-fixable ($0 re-assembly) · raised by: 1. first-second scroll-stop_
- **[n/a]** SYNTHETIC NARRATOR: narration voice "en-IN-NeerjaNeural" is an edge-tts neural voice — banned in ads.
  - **fix:** Presenter dialogue on camera, or an approved Sarvam Bulbul v3 male voice.
  - _needs re-render (costs money) · raised by: hard-rules_
- **[n/a]** PRE-FLIGHT (voice-plan) voice — voice "en-IN-NeerjaNeural" is an edge-tts/neural TTS voice — it reads as synthetic narration.
  - **fix:** Move the lines on-camera as presenter dialogue, or use an approved Sarvam Bulbul v3 voice (shubh, aditya, gokul, rahul, ...).
  - _needs re-render (costs money) · raised by: pre-flight (retro)_
- **[n/a]** PRE-FLIGHT (voice-plan) shots[#s2].vo — the reel opens on the presenter's Veo NATIVE voice (shot s1) and then switches to a separate narrator at shot s2 — two different voices in one reel.
  - **fix:** Rewrite so the presenter says these lines on camera (LAW §2: eliminating narration is both cheaper and better than buying better TTS).
  - _needs re-render (costs money) · raised by: pre-flight (retro)_
- **[n/a]** PRE-FLIGHT (capture-target) shots[2].capture.url — product shot captures a PAYMENT surface: https://www.vedichour.com/pricing
  - **fix:** Point the capture at the REPORT (hour slots + what-to-do-when). The ad shows the product, never the checkout.
  - _auto-fixable ($0 re-assembly) · raised by: pre-flight (retro)_
- **[n/a]** PRE-FLIGHT (capture-target) shots[3].capture.url — product shot captures a PAYMENT surface: https://www.vedichour.com/pricing
  - **fix:** Point the capture at the REPORT (hour slots + what-to-do-when). The ad shows the product, never the checkout.
  - _auto-fixable ($0 re-assembly) · raised by: pre-flight (retro)_
- **[n/a]** PRE-FLIGHT (capture-content) shots[2].capture.url — the page https://www.vedichour.com/pricing shows banned jargon ON SCREEN: "swiss ephemeris", "lahiri", "ayanamsa", "sidereal", "vimshottari". The script is clean but the viewer still reads it.
  - **fix:** Capture a page/section without the jargon (the report body), or scroll past that block, or reword the page.
  - _auto-fixable ($0 re-assembly) · raised by: pre-flight (retro)_
- **[n/a]** PRE-FLIGHT (narration-fit) shots[2].vo — 36 words in a 8s shot — 18 over the 18-word budget. It will be rushed or cut mid-sentence.
  - **fix:** Cut to ≤18 words, or lengthen the shot to 16s.
  - _needs re-render (costs money) · raised by: pre-flight (retro)_
- **[n/a]** PRE-FLIGHT (narration-fit) shots[3].vo — 18 words in a 7s shot — 2 over the 16-word budget. It will be rushed or cut mid-sentence.
  - **fix:** Cut to ≤16 words, or lengthen the shot to 8s.
  - _needs re-render (costs money) · raised by: pre-flight (retro)_

### MAJOR

- **[5.20-6.28s]** A 1.08s silence stalls the hook and makes the voice handover more conspicuous at the first shot transition.
  - **fix:** Extend the presenter's delivery or bridge the transition with continuous human speech and low room tone.
  - _needs re-render (costs money) · raised by: 4. voice & audio naturalness_
- **[6.2-9.3s]** Tension lands at 6.2s, but “Reply type karke main ruk gayi” stretches across a generic homepage while audio is silent from 8.15-9.58s. This becomes a swipe-risk beat before proof starts.
  - **fix:** Compress this beat to about 1.5s and immediately show the Interview selection being tapped.
  - _advisory · raised by: a. ad-craft / hook_
- **[7.7s]** A live 'Feedback' floating button widget from the app's FeedbackWidget is visible in the lower-right of the homepage capture — it reads as a half-built UI artifact or debug element to a first-time viewer.
  - **fix:** Hide or programmatically dismiss the feedback widget before screen-capturing any product page.
  - _auto-fixable ($0 re-assembly) · raised by: d. motion / pacing / on-screen_
- **[7.7s]** The yellow “Feedback” widget covers the product paragraph behind it, leaving page copy visibly interrupted and unreadable.
  - **fix:** Dismiss or hide the feedback widget before recording the product page.
  - _advisory · raised by: 3. on-screen text & caption legibility_
- **[8.15-9.58s]** A 1.43s dead-air gap interrupts the short s2 line and crosses into s3, risking a drop before the product explanation begins.
  - **fix:** Retiming the human VO so the final s2 phrase lands nearer 9.3s and s3 begins immediately at the cut.
  - _auto-fixable ($0 re-assembly) · raised by: 4. voice & audio naturalness_
- **[9.3-24.5s]** s3 VO narration rate is 2.37 wps (36 words over a 15.2s shot), exceeding the 2.3 wps pre-flight ceiling. Measured tail margin is only 0.32s — any TTS hesitation causes an audible cut or the final word ('hai') to be clipped.
  - **fix:** Cut ~2 words from s3 script, e.g. drop 'aur poore din ke' → '18 planetary hours ek grid mein seedha aa gaye.' That brings the line to ~34 words / 15.2s = 2.24 wps.
  - _auto-fixable ($0 re-assembly) · raised by: b. script & voice_
- **[9.3-24.5s]** The longest paragraph occupies 14.88s of a 15.2s shot, leaving only 0.32s margin; combined with its long enumerative syntax, it will sound compressed rather than conversational.
  - **fix:** Shorten s3 substantially or extend its shot; target at least 1s of timing headroom and split the thought into natural spoken phrases.
  - _auto-fixable ($0 re-assembly) · raised by: 4. voice & audio naturalness_
- **[11.3s]** The hook receives only a partial, easily missed payoff: the background says 17:00-18:00 is the clearest window, but the caption overlay competes with it and no 10 AM result is shown. The viewer never sees why 5 PM beats 10 AM.
  - **fix:** Hold a clean comparison frame long enough to read both slots, then visibly highlight 5 PM and its plain-English context.
  - _auto-fixable ($0 re-assembly) · raised by: a. ad-craft / hook_
- **[11.3s]** The page quote contains unexplained jargon: “Mars hora, Amrit choghadiya.” A normal Indian professional cannot infer what these classifications mean.
  - **fix:** Show only the plain-language conclusion, for example: “17:00–18:00 is the clearest window; keep 12:00–13:00 for routine work.”
  - _advisory · raised by: 3. on-screen text & caption legibility_
- **[11.3s]** The burned-in “VEDICHOUR” wordmark collides directly with the page line containing “sample chart (15 July 1992 · 09:00 · New Delhi),” making both text layers difficult to read.
  - **fix:** Move the wordmark into a fixed empty margin or place it on an opaque header strip that does not cover page text.
  - _auto-fixable ($0 re-assembly) · raised by: 3. on-screen text & caption legibility_
- **[14.9s, 22.1s, 25.7s, 29.3s]** Caption bands repeatedly cover meaningful page text: “18 PLANETARY HOURS” obscures the hourly-window quote; “WINDOW KIS TARAH” covers “LIFE CHAPTERS”; “KOI OUTCOME CLAIM” covers the Kundali description; and “HISAAB SE TIMING” covers the product headline.
  - **fix:** Reframe or scroll each capture to create a dedicated empty caption zone, then keep every caption band inside that zone.
  - _auto-fixable ($0 re-assembly) · raised by: 3. on-screen text & caption legibility_
- **[18.5-22.1s]** More unexplained astrology jargon is prominent: “DOSHA CHECK,” “Manglik,” “Mangal Dosha” and “lagna.”
  - **fix:** Exclude this card from the reel or replace these labels with an immediately understandable plain-language summary.
  - _advisory · raised by: 3. on-screen text & caption legibility_
- **[23.23-24.78s]** A 1.56s gap leaves the explanation hanging and delays s4 narration until after the visual transition.
  - **fix:** Carry the end of s3 naturally toward 24.5s and begin s4 at the shot boundary without an empty beat.
  - _auto-fixable ($0 re-assembly) · raised by: 4. voice & audio naturalness_
- **[25.7-32.9s]** Frames at 25.7s, 29.3s, and 32.9s abandon the opening slot-choice promise for a generic free-Kundli page; the reel never visibly completes a clear 10 AM-versus-5 PM comparison.
  - **fix:** End on a side-by-side 10 AM and 5 PM Hora-card comparison, then show the selected timing lens before the CTA; remove the unrelated free-Kundli scroll.
  - _auto-fixable ($0 re-assembly) · raised by: 1. first-second scroll-stop_
- **[25.7-32.9s]** The captured page also exposes a dense jargon list: “Lagna, Moon sign, Nakshatra, Sun sign, current dasha and the Manglik, Kaal Sarpa and Sade Sati flags.”
  - **fix:** Use a simplified product-page capture that describes the output in ordinary language without these technical labels.
  - _auto-fixable ($0 re-assembly) · raised by: 3. on-screen text & caption legibility_
- **[25.7-32.9s]** The footage switches to the Free Janam Kundali marketing page and blank birth-date/time/city form. This is not the timing report, adds no proof of rated hour-windows, and the reel ends at 32.9s with the form cut off mid-element.
  - **fix:** Continue showing the generated timing report through the CTA, preferably a stable grid or opened Hora card; end on a complete, readable product state.
  - _auto-fixable ($0 re-assembly) · raised by: 5. does the product prove the promise_
- **[30.8-33.4s]** The CTA appears for only 2.6s as small three-line copy over the Kundli form. “Reply se pehle reflect karo” is a thought, not an action, and it does not tell viewers to open, try, or download VedicHour.
  - **fix:** Use a short actionable CTA for at least 3s: “10 AM ya 5 PM? VedicHour par apna Hora check karo,” paired with the timing screen and a clear button or URL.
  - _auto-fixable ($0 re-assembly) · raised by: a. ad-craft / hook_
- **[31.36-33.40s]** The reel ends with 2.06s of silence while the CTA remains on screen, draining momentum at the conversion moment.
  - **fix:** Continue the human delivery through the CTA or add a concise spoken CTA ending near 33.1s.
  - _auto-fixable ($0 re-assembly) · raised by: 4. voice & audio naturalness_
- **[31.4s–33.4s]** 2.06s of complete silence during the CTA band (30.8s–33.4s). The ad ends dead — no voice, no music, no ambient sound — for the last two seconds while the CTA text holds. Energy collapses at the exact moment the viewer should act.
  - **fix:** Add a short ambient music tail or a low-volume tone bed that sustains through the CTA hold, or trim the CTA display to ≤1s after the last audio cue so the reel does not linger silently.
  - _auto-fixable ($0 re-assembly) · raised by: d. motion / pacing / on-screen_
- **[32.9s]** The CTA “Reply se pehle reflect karo. Your Life, Decoded Hour by Hour.” overlaps the form labels “Birth date” and “Birth time,” producing an obvious text collision.
  - **fix:** Put the CTA on a full-width opaque closing card or move it to clear space above the form.
  - _auto-fixable ($0 re-assembly) · raised by: 3. on-screen text & caption legibility_
- **[0.0-1.0s]** At 0.5s, “HR ne do slots bheje” is legible and relatable, but too generic to stop a thumb: it omits “interview,” the two times, and the decision stakes. Specificity arrives only after 2.7s.
  - **fix:** Make frame 1 the complete conflict: “Interview slot: 10 AM ya 5 PM?” with the HR-message visual.
  - _auto-fixable ($0 re-assembly) · raised by: a. ad-craft / hook_
- **[n/a]** PAYMENT SURFACE in a product shot — creative shots[2].capture.url: "https://www.vedichour.com/pricing". Scrolls must show the REPORT, never a pricing/checkout page.
  - **fix:** Re-capture against the report (hour slots + what-to-do-when).
  - _auto-fixable ($0 re-assembly) · raised by: hard-rules_
- **[n/a]** PAYMENT SURFACE in a product shot — creative shots[3].capture.url: "https://www.vedichour.com/pricing". Scrolls must show the REPORT, never a pricing/checkout page.
  - **fix:** Re-capture against the report (hour slots + what-to-do-when).
  - _auto-fixable ($0 re-assembly) · raised by: hard-rules_

### MINOR

- **[5.2s–6.3s]** ~1.1s audio gap at the s1→s2 transition: presenter stops speaking at 5.2s but the shot holds until 6.0s, then VO begins at 6.3s — over a second of dead audio spanning the cut.
  - **fix:** Pre-lap the s2 VO to begin at 5.8s (inside the tail of s1), or trim s1 to end when the last spoken word lands (~5.2s).
  - _auto-fixable ($0 re-assembly) · raised by: d. motion / pacing / on-screen_
- **[5.2-6.3s]** 1.08s of dead air mid-reel — short-form viewers drop on silence.
  - **fix:** Tighten the shot transition or duck a licensed music bed under the gap (media/music/).
  - _auto-fixable ($0 re-assembly) · raised by: hard-rules_
- **[8.2-9.6s]** 1.43s of dead air mid-reel — short-form viewers drop on silence.
  - **fix:** Tighten the shot transition or duck a licensed music bed under the gap (media/music/).
  - _auto-fixable ($0 re-assembly) · raised by: hard-rules_
- **[15.6-16.7s]** 1.02s of dead air mid-reel — short-form viewers drop on silence.
  - **fix:** Tighten the shot transition or duck a licensed music bed under the gap (media/music/).
  - _auto-fixable ($0 re-assembly) · raised by: hard-rules_
- **[15.64-16.66s]** A 1.02s silence breaks the dense s3 sentence between closely sequenced captions, producing stop-start, machine-like cadence.
  - **fix:** Record s3 as conversational clauses with a shorter intentional breath of roughly 0.3-0.5s.
  - _auto-fixable ($0 re-assembly) · raised by: 4. voice & audio naturalness_
- **[18.5s]** The first visible page line, “18:00 — Mars hora, Amrit choghadiya,” is clipped against the top edge and yellow border.
  - **fix:** Lower the page position or crop beneath the clipped line so no partial text enters the frame.
  - _auto-fixable ($0 re-assembly) · raised by: 3. on-screen text & caption legibility_
- **[23.2s–24.8s]** 1.56s audio gap at the s3→s4 cut: last VO word in s3 lands at ~23.2s, shot continues to 24.5s, and s4 VO begins at ~24.8s — 1.56s of silence crossing the cut.
  - **fix:** Trim s3 to end at ~23.5s, or start s4 VO at 24.5s on the cut rather than 0.3s after it.
  - _auto-fixable ($0 re-assembly) · raised by: d. motion / pacing / on-screen_
- **[23.2-24.8s]** 1.56s of dead air mid-reel — short-form viewers drop on silence.
  - **fix:** Tighten the shot transition or duck a licensed music bed under the gap (media/music/).
  - _auto-fixable ($0 re-assembly) · raised by: hard-rules_
- **[0.0-2.7s]** Hook caption reads 'HR ne do slots bheje' while the presenter simultaneously says 'HR ka message aaya' — mismatched text and audio for the first 2.7s. The phrase 'HR ka message' is never captioned; muted viewers get a different sentence than listeners.
  - **fix:** Change the hook caption to 'HR KA MESSAGE AAYA' to stay in sync with the presenter's spoken opening.
  - _auto-fixable ($0 re-assembly) · raised by: b. script & voice_

### NIT

- **[16.75-18.12s]** 'hora card' in the s3 VO is unexplained jargon — a non-astrologer has no frame for 'hora' even with 'planetary hours' two seconds prior. The plain-English promise the script makes is broken by its own terminology.
  - **fix:** Replace 'hora card' with 'timing card' or 'hour card'.
  - _auto-fixable ($0 re-assembly) · raised by: b. script & voice_

## Fix queue (auto-fixable, $0)

The render/assembly path can consume these without spending anything (also in `fix_queue.json` and the `fix_queue` table):

- [7.7s] Homepage badge pill reads 'CLASSICAL VEDIC SYSTEM · AI-POWERED · SWISS EPHEMERIS PRECISION' — white-on-dark, fully legible on screen at the moment caption 'REPLY TYPE KARKE' appears. 'swiss ephemeris' is on the banned-jargon list (project law §1, pre-flight gate). → Crop homepage capture so the badge pill is off-frame (start scroll below it), or replace s2 entirely with a shot of the actual hora-grid report page.
- [7.7s] The captured page visibly says “SWISS EPHEMERIS PRECISION.” “Swiss Ephemeris” is explicitly banned jargon. → Replace or recapture this page section with jargon-free copy such as “precise astronomical calculations.”
- [9.3-24.5s] The claimed proof is not demonstrated: narration says Interview was selected, an 18-hour grid appeared, and a Hora card was opened, but the audited frames show report excerpts, Life Chapters, and Dosha Check instead. At 18.5s and 22.1s, captions about window context sit over unrelated Life Chapters/Dosha content. → Show the actual sequence on screen: select Interview, reveal the 18-hour grid, compare 10 AM with 5 PM, then open the relevant Hora card.
- [11.3-14.9s] The footage shows a marketing/sample-excerpts page, headed "Three excerpts computed from a real sample chart." Its "Hourly Windows" excerpt names 17:00–18:00 as 98/100 and 12:00–13:00 for routine work, plus the label "18 rated slots." It never shows Interview being selected, the promised whole-day 18-window grid, multiple rated windows, or a Hora card being opened. The label claims the feature; it → Replace this section with an actual report recording: show Interview selected, hold on the complete 18-window rated grid long enough to read several times and ratings, then visibly tap one Hora card.
- [14.9s–22.1s] The LIFE CHAPTERS card metadata footer reads 'Vimshottari dasha · Sun period active' — white monospace text, clearly legible in the frames at 14.9s, 18.5s, and 22.1s across approximately 7 seconds of screen time. 'vimshottari' is explicitly on the banned-jargon list (project law §1). → Crop the product scroll so the card metadata row is never in frame, or suppress this label in the product UI before screen-capturing.
- [14.9-22.1s] The report card visibly says “Vimshottari dasha · Sun period active” in frames at 14.9s, 18.5s and 22.1s. “Vimshottari” is explicitly banned. → Remove this card from the capture or replace its footer with plain language such as “Current life phase: Sun period.”
- [18.5-22.1s] During the exact plain-English-guidance promise, the relevant Hourly Windows excerpt scrolls offscreen. At 18.5s its final line and "18 rated slots" remain partially visible, while "Life Chapters" and "Dosha Check" dominate; at 22.1s only those unrelated birth-chart sections are readable. No opened window explains what that hour suits. → Keep the opened Hora card onscreen throughout this narration and show legible plain-English suitability guidance tied to its specific time and rating.
- [24.5-30.8s] The proof beat ends at 24.5s and is replaced for 6.3s by a Free Janam Kundli page. At 25.7s and 29.3s, the dominant offer is birth-chart generation, so a one-watch viewer can reasonably conclude VedicHour is a Kundli generator rather than an hourly timing app. → Remove the Kundli shot and continue showing the interview timing grid or Hora-card result through the CTA.
- [24.5s–33.4s] s4 is an empty birth-data input form (free-kundli hero page), not the report. Owner rule: product shots show THE REPORT (hour-slots + plain-English 'what this window suits' text). The s4 narration claims '18 planetary hours ek grid mein / hora card' — but the screen shows an empty dd/mm/yyyy date picker, which proves nothing and contradicts the audio claim. → Replace s4 with a scroll of the actual report showing the hora-grid or a hora card with its plain-English context text. The free-kundli input page is never an appropriate ad product shot.
- [25.7s–33.4s] s4 shows the free-kundli page (/free-kundli) whose body text reads 'we cast your sidereal chart with the Swiss Ephemeris' — both 'swiss ephemeris' and 'sidereal' are fully legible in frames at 25.7s and 29.3s. Two banned jargon words in large body text, on screen for 8.9s. → Replace s4 entirely with a shot of the hora-grid report. This also resolves finding below — the free-kundli form itself is not the report.
- [25.7-32.9s] The product-page sentence visibly contains both banned terms: “we cast your sidereal chart with the Swiss Ephemeris.” It appears at 25.7s and is fully readable at 29.3s and 32.9s. → Rewrite the live page copy and recapture it, or use a crop that completely excludes this sentence.
- [0.0-2.0s] At 0.5s, viewers see generic stock-feeling café footage: a passive man looking down at his phone, with no eye contact, reaction, message UI, or visible decision tension. The vague hook “HR ne do slots bheje” withholds the compelling 10 AM-versus-5 PM dilemma beyond the hostile 0.8-second attention window, giving viewers no reason to stay. → Open on a tight HR-message visual showing “10 AM or 5 PM?” immediately, paired with a visible reaction and the high-contrast hook “Interview: 10 AM ya 5 PM—kaunsa?” on screen by 0.2s.
- [n/a] PRE-FLIGHT (capture-target) shots[2].capture.url — product shot captures a PAYMENT surface: https://www.vedichour.com/pricing → Point the capture at the REPORT (hour slots + what-to-do-when). The ad shows the product, never the checkout.
- [n/a] PRE-FLIGHT (capture-target) shots[3].capture.url — product shot captures a PAYMENT surface: https://www.vedichour.com/pricing → Point the capture at the REPORT (hour slots + what-to-do-when). The ad shows the product, never the checkout.
- [n/a] PRE-FLIGHT (capture-content) shots[2].capture.url — the page https://www.vedichour.com/pricing shows banned jargon ON SCREEN: "swiss ephemeris", "lahiri", "ayanamsa", "sidereal", "vimshottari". The script is clean but the viewer still reads it. → Capture a page/section without the jargon (the report body), or scroll past that block, or reword the page.
- [7.7s] A live 'Feedback' floating button widget from the app's FeedbackWidget is visible in the lower-right of the homepage capture — it reads as a half-built UI artifact or debug element to a first-time viewer. → Hide or programmatically dismiss the feedback widget before screen-capturing any product page.
- [8.15-9.58s] A 1.43s dead-air gap interrupts the short s2 line and crosses into s3, risking a drop before the product explanation begins. → Retiming the human VO so the final s2 phrase lands nearer 9.3s and s3 begins immediately at the cut.
- [9.3-24.5s] s3 VO narration rate is 2.37 wps (36 words over a 15.2s shot), exceeding the 2.3 wps pre-flight ceiling. Measured tail margin is only 0.32s — any TTS hesitation causes an audible cut or the final word ('hai') to be clipped. → Cut ~2 words from s3 script, e.g. drop 'aur poore din ke' → '18 planetary hours ek grid mein seedha aa gaye.' That brings the line to ~34 words / 15.2s = 2.24 wps.
- [9.3-24.5s] The longest paragraph occupies 14.88s of a 15.2s shot, leaving only 0.32s margin; combined with its long enumerative syntax, it will sound compressed rather than conversational. → Shorten s3 substantially or extend its shot; target at least 1s of timing headroom and split the thought into natural spoken phrases.
- [11.3s] The hook receives only a partial, easily missed payoff: the background says 17:00-18:00 is the clearest window, but the caption overlay competes with it and no 10 AM result is shown. The viewer never sees why 5 PM beats 10 AM. → Hold a clean comparison frame long enough to read both slots, then visibly highlight 5 PM and its plain-English context.
- [11.3s] The burned-in “VEDICHOUR” wordmark collides directly with the page line containing “sample chart (15 July 1992 · 09:00 · New Delhi),” making both text layers difficult to read. → Move the wordmark into a fixed empty margin or place it on an opaque header strip that does not cover page text.
- [14.9s, 22.1s, 25.7s, 29.3s] Caption bands repeatedly cover meaningful page text: “18 PLANETARY HOURS” obscures the hourly-window quote; “WINDOW KIS TARAH” covers “LIFE CHAPTERS”; “KOI OUTCOME CLAIM” covers the Kundali description; and “HISAAB SE TIMING” covers the product headline. → Reframe or scroll each capture to create a dedicated empty caption zone, then keep every caption band inside that zone.
- [23.23-24.78s] A 1.56s gap leaves the explanation hanging and delays s4 narration until after the visual transition. → Carry the end of s3 naturally toward 24.5s and begin s4 at the shot boundary without an empty beat.
- [25.7-32.9s] Frames at 25.7s, 29.3s, and 32.9s abandon the opening slot-choice promise for a generic free-Kundli page; the reel never visibly completes a clear 10 AM-versus-5 PM comparison. → End on a side-by-side 10 AM and 5 PM Hora-card comparison, then show the selected timing lens before the CTA; remove the unrelated free-Kundli scroll.
- [25.7-32.9s] The captured page also exposes a dense jargon list: “Lagna, Moon sign, Nakshatra, Sun sign, current dasha and the Manglik, Kaal Sarpa and Sade Sati flags.” → Use a simplified product-page capture that describes the output in ordinary language without these technical labels.
- [25.7-32.9s] The footage switches to the Free Janam Kundali marketing page and blank birth-date/time/city form. This is not the timing report, adds no proof of rated hour-windows, and the reel ends at 32.9s with the form cut off mid-element. → Continue showing the generated timing report through the CTA, preferably a stable grid or opened Hora card; end on a complete, readable product state.
- [30.8-33.4s] The CTA appears for only 2.6s as small three-line copy over the Kundli form. “Reply se pehle reflect karo” is a thought, not an action, and it does not tell viewers to open, try, or download VedicHour. → Use a short actionable CTA for at least 3s: “10 AM ya 5 PM? VedicHour par apna Hora check karo,” paired with the timing screen and a clear button or URL.
- [31.36-33.40s] The reel ends with 2.06s of silence while the CTA remains on screen, draining momentum at the conversion moment. → Continue the human delivery through the CTA or add a concise spoken CTA ending near 33.1s.
- [31.4s–33.4s] 2.06s of complete silence during the CTA band (30.8s–33.4s). The ad ends dead — no voice, no music, no ambient sound — for the last two seconds while the CTA text holds. Energy collapses at the exact moment the viewer should act. → Add a short ambient music tail or a low-volume tone bed that sustains through the CTA hold, or trim the CTA display to ≤1s after the last audio cue so the reel does not linger silently.
- [32.9s] The CTA “Reply se pehle reflect karo. Your Life, Decoded Hour by Hour.” overlaps the form labels “Birth date” and “Birth time,” producing an obvious text collision. → Put the CTA on a full-width opaque closing card or move it to clear space above the form.
- [0.0-1.0s] At 0.5s, “HR ne do slots bheje” is legible and relatable, but too generic to stop a thumb: it omits “interview,” the two times, and the decision stakes. Specificity arrives only after 2.7s. → Make frame 1 the complete conflict: “Interview slot: 10 AM ya 5 PM?” with the HR-message visual.
- [n/a] PAYMENT SURFACE in a product shot — creative shots[2].capture.url: "https://www.vedichour.com/pricing". Scrolls must show the REPORT, never a pricing/checkout page. → Re-capture against the report (hour slots + what-to-do-when).
- [n/a] PAYMENT SURFACE in a product shot — creative shots[3].capture.url: "https://www.vedichour.com/pricing". Scrolls must show the REPORT, never a pricing/checkout page. → Re-capture against the report (hour slots + what-to-do-when).
- [5.2s–6.3s] ~1.1s audio gap at the s1→s2 transition: presenter stops speaking at 5.2s but the shot holds until 6.0s, then VO begins at 6.3s — over a second of dead audio spanning the cut. → Pre-lap the s2 VO to begin at 5.8s (inside the tail of s1), or trim s1 to end when the last spoken word lands (~5.2s).
- [5.2-6.3s] 1.08s of dead air mid-reel — short-form viewers drop on silence. → Tighten the shot transition or duck a licensed music bed under the gap (media/music/).
- [8.2-9.6s] 1.43s of dead air mid-reel — short-form viewers drop on silence. → Tighten the shot transition or duck a licensed music bed under the gap (media/music/).
- [15.6-16.7s] 1.02s of dead air mid-reel — short-form viewers drop on silence. → Tighten the shot transition or duck a licensed music bed under the gap (media/music/).
- [15.64-16.66s] A 1.02s silence breaks the dense s3 sentence between closely sequenced captions, producing stop-start, machine-like cadence. → Record s3 as conversational clauses with a shorter intentional breath of roughly 0.3-0.5s.
- [18.5s] The first visible page line, “18:00 — Mars hora, Amrit choghadiya,” is clipped against the top edge and yellow border. → Lower the page position or crop beneath the clipped line so no partial text enters the frame.
- [23.2s–24.8s] 1.56s audio gap at the s3→s4 cut: last VO word in s3 lands at ~23.2s, shot continues to 24.5s, and s4 VO begins at ~24.8s — 1.56s of silence crossing the cut. → Trim s3 to end at ~23.5s, or start s4 VO at 24.5s on the cut rather than 0.3s after it.
- [23.2-24.8s] 1.56s of dead air mid-reel — short-form viewers drop on silence. → Tighten the shot transition or duck a licensed music bed under the gap (media/music/).
- [0.0-2.7s] Hook caption reads 'HR ne do slots bheje' while the presenter simultaneously says 'HR ka message aaya' — mismatched text and audio for the first 2.7s. The phrase 'HR ka message' is never captioned; muted viewers get a different sentence than listeners. → Change the hook caption to 'HR KA MESSAGE AAYA' to stay in sync with the presenter's spoken opening.
- [16.75-18.12s] 'hora card' in the s3 VO is unexplained jargon — a non-astrologer has no frame for 'hora' even with 'planetary hours' two seconds prior. The plain-English promise the script makes is broken by its own terminology. → Replace 'hora card' with 'timing card' or 'hour card'.

## Owner decision

```
npm run approvals                       # see everything waiting
npm run approve 2026-07-25-hr-ne-do-slots-bheje-v2
npm run reject  2026-07-25-hr-ne-do-slots-bheje-v2 "why it is wrong"
```

A rejection is filed as a lesson so the same mistake cannot come back.

_Generated 2026-07-26T08:11:00.257Z · run ea206ecf_