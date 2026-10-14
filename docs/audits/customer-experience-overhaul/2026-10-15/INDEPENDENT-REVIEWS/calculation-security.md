# Independent Calculator Reliability and Security Review

Date: 2026-10-15. Recorded from source inspection before reading any other review or grade. Scope: assigned birth input, calculator surfaces, public chart/geocode routes, new tools helpers and regression tests. This is one reviewer examining backend, integration, security and bug-triage perspectives, not four independent reviewers. No billed model, email, customer-record or deployment actions performed.

## Initial Findings

- P1, backend/integration: ChartTool initializes birth time to 12:00:00 and its request/draft paths silently substitute noon when empty. Its validity check requires neither a real calendar date nor a deliberate valid time. The chart route also substitutes noon. Unknown time therefore produces apparently precise time-dependent results.
- P1, integration: BirthDetailsInput replaces unknown time with noon and promises accurate Moon, nakshatra and compatibility facts without interval calculation. City resolution chooses data[0] without user confirmation. Editing city does not immediately abort the previous lookup; a late response can restore the old city and coordinates.
- P1, security: tools/chart accepts email as an unlock and upserts newsletter_subscribers without explicit opt-in; otherwise it queries account authentication just to gate already computed deterministic facts. The client includes an email/blur wall. Remove this calculator-only gate, preserving ownership and consent flows elsewhere.
- P1, bug triage: detectDoshas represents unavailable Saturn transit with present=false, while ChartTool renders and shares that as definitive No. An unavailable result must remain unknown, including full-chart and sharing paths.
- P1, backend: public chart validation omits actual dates, future dates, valid time and robust runtime payload checks. Natal fetch failure can escape the handler; two sequential 30-second upstream calls approach the route ceiling.
- P2, integration: existing coordinate validity uses legacy sentinel behavior; explicitly selected equator/zero-longitude cities need valid zero coordinates and a separate unselected state.
- P2, security: calculator_failed forwards arbitrary error text to analytics; geocode logs arbitrary provider error messages. Both can disclose entered data or service details. Errors and event reasons should be bounded static codes.
- P2, continuity: draft writing is automatic after calculation, result retrieval is absent, no clear local-storage controls exist, and form edits leave old results visible. Calculator links promise unavailable paid reports/forecasts.
- P2, accessibility: geocode feedback has no live announcement and no city candidate chooser; result typography and rows need bounded, wrapping mobile layout.

## Planned Verification

Synthetic-only tests for missing/approximate/unknown time, real and future dates, leap years, zero coordinates, request timeout/recovery, stale city/chart response rejection, free anonymous doshas without persistence/auth, safe unknown Saturn states, minimal local persistence/expiry/clear, and existing optional-prop compatibility. Reference ephemeris accuracy, historical time-zone boundaries and independent interval calculations are not established by these tests.

## Implementation and Verification

- Birth input requires an explicit certainty choice and a supplied time; unknown time is explained without calculation. Approximate output is explicitly a single-time estimate, not an interval result. City search exposes up to five sanitized, full-label candidates and requires selection. Existing optional props and BirthDetails consumers remain compatible.
- Shared API: src/lib/tools/birth.ts exports validateBirth(input, today?), returning {ok:true, person} with normalized HH:MM:SS, or {ok:false, code, message}. INVALID_BIRTH and UNKNOWN_TIME are static error categories; existing callers may omit accuracy only when supplying a real time.
- Chart requests cancel on edits/clear/unmount, and logical generation checks discard late replies even if a provider ignores abort. The geocoder uses the latest input values and does not overwrite intervening date/name/time edits. Deadlines cover both HTTP response and JSON body: client chart 25s, client geocode 8s, service natal 16s, live Saturn 4s, geocode provider 6s.
- All calculator doshas are returned anonymously without email, newsletter upsert, auth lookup, billing or model generation. The route calls the configured deterministic backend directly and forwards no service-role key or caller-derived origin. Birth responses use no-store. Error/analytics reasons are static and contain no provider error text or birth details.
- Unavailable live Saturn and incomplete natal pattern inputs use present:null, rendered/shared as Unavailable, never definitive No. Restored results are timestamped snapshots rather than fresh live claims. The glossary separates positions and rule-based classifications from astrological meaning.
- Local saving is unchecked by default. Only birth date/time/certainty, selected city/coordinates and derived result are saved under vh_calculator_v1. No name, email, question, promo code or account identifier. Saves expire seven days after the last actual saved change; merely restoring does not extend retention. Expired/corrupt data is removed when accessed. Users can withdraw consent, edit without stale saved results, or clear only calculator data. Storage denial produces a recoverable message and does not prevent calculation.
- Calculator follow-ups point only to /free-kundli, /sample-report and /help. The primary removed /now because no public page exists at that route. No unavailable purchase promises. Changes stay inside assigned files plus this explicitly requested review record; no commit/push/deployment performed.

### Evidence

- 108 new regressions pass: 52 birth validation/candidate tests, 8 result-integrity tests, 5 deadline/cancellation tests, 10 storage tests, 26 chart/geocode route tests, 7 real-browser UI tests with every API/analytics request mocked.
- 64 existing Kundli, dosha helper, coordinate, birth funnel, trust and handoff regressions pass.
- npm run typecheck passes on the final rerun. An interim out-of-scope src/__tests__/helpContinuity.test.ts:11 MapIterator/target compatibility error was resolved by concurrent work; this worker did not edit it. Scoped ESLint passes without warnings. Scoped git diff --check passes; the earlier global check reported a separate out-of-scope .env.example:113 trailing blank line. These concurrent files were not edited by this worker.
- Real deterministic service sample from the primary e2e scenario (1990-05-15, 09:30 local, New Delhi) returns HTTP 200, lagna Gemini, moon_sign Sagittarius, all doshas present in the response, and no doshas_locked field. No model, newsletter, email or customer-record operation was invoked.
- Browser checks exercised 1440px desktop and 390px mobile, no document/control overflow, explicit city choice, deliberate time, unknown-time refusal, optional save/refresh/edit/clear, withdrawal of storage consent, late chart/city replies, provisional approximate results and safe retry after private provider error text. Screenshots were captured and visually inspected in the system temporary folder, not added to this checkout.
- Reproduce UI regressions against the existing local server using CALCULATOR_BASE_URL=http://127.0.0.1:3100 and CALCULATOR_BROWSER_CHANNEL=chrome, then vitest run src/__tests__/calculatorBrowser.test.ts. Browser tests skip unless CALCULATOR_BASE_URL is set; the other new tests do not require a server or external requests.

## Remaining Calculation Uncertainty

This verifies input integrity and transport/result continuity, not general numerical accuracy. No independent published ephemeris comparison, historical/DST fold-gap validation, polar-house reference check or interval-aware birth-time engine was added. The numerical engine and its timezone conversion remain unchanged. The live transit sample uses a fixed modern UTC location rather than invented natal noon; unavailability is reported honestly. Seven-day local expiry is enforced on access, not by a background browser deletion service. Global release build, production deployment and broader cross-product verification remain with the primary engineer.

## Changed Files

- src/components/forms/BirthDetailsInput.tsx
- src/components/tools/ChartTool.tsx
- src/components/tools/CalculatorPage.tsx
- src/components/tools/TimingBridge.tsx
- src/app/api/tools/chart/route.ts
- src/app/api/geocode/route.ts
- src/lib/tools/birth.ts
- src/lib/tools/chart.ts
- src/lib/tools/requests.ts
- src/lib/tools/storage.ts
- src/lib/tools/test-fixtures.ts
- src/lib/tools/birth.test.ts
- src/lib/tools/chart.test.ts
- src/lib/tools/requests.test.ts
- src/lib/tools/storage.test.ts
- src/__tests__/calculatorRoutes.test.ts
- src/__tests__/calculatorBrowser.test.ts
- docs/audits/customer-experience-overhaul/2026-10-15/INDEPENDENT-REVIEWS/calculation-security.md

## Optional Walkthrough Media Verification

Authorized follow-up: only scripts/record-free-chart-walkthrough.mjs, new public/walkthroughs media and this review append. QA artifacts were subsequently directed by the primary into artifacts/customer-experience/walkthrough. No application/component files were edited for this task. Help-page integration, native player placement, release staging and deployment remain with the primary.

### Delivered Public Assets

- public/walkthroughs/free-chart-desktop.mp4
- public/walkthroughs/free-chart-desktop-poster.jpg
- public/walkthroughs/free-chart-desktop.en.vtt
- public/walkthroughs/free-chart-mobile.mp4
- public/walkthroughs/free-chart-mobile-poster.jpg
- public/walkthroughs/free-chart-mobile.en.vtt
- public/walkthroughs/free-chart-transcript.md
- public/walkthroughs/LICENSE.txt

Only those eight deliverables are in the public media directory. Original recording, extracted posters, captions and transcript are offered under CC BY 4.0 with underlying application marks/fonts retained by their owners. No stock footage, third-party music, actor footage, generated avatar or synthetic narrator was used.

### Continuous Actual Capture

Installed Chrome runs the actual local calculator at localhost:3100/free-kundli in a fresh anonymous context. The fictional example is 1990-05-15, 09:30 local time, New Delhi, India. Both birth inputs and result are actual UI state. The date/time are entered through the real inputs; the city is typed, the real geocoder is searched, a New Delhi match is selected, the genuine free calculation is submitted, and the result is scrolled into view. Saving on this device remains unchecked. Calculator/geocode responses are not mocked. Analytics, external client-side requests and unrelated APIs are blocked to avoid real records or account/payment interactions.

The recorder takes a fresh JPEG screenshot of the browser viewport approximately every 125ms and pipes every frame in order to local FFmpeg while all clicking, typing, waiting and scrolling occur. The final takes contain no cuts, substituted screens, still-image montage, narration, presenter overlay or sped-up wait. The initial encoding colour-range mismatch was corrected before the final takes. Source-refresh/interim failed takes are not offered as completed walkthroughs.

FFprobe and capture receipts:

| Asset | Dimensions | Duration | Captured/Decoded Frames | Frame Rate | Format | Video Bytes | Largest Capture Gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Desktop | 1280 x 900 | 40.000s | 320 / 320 | 8 fps | H.264, yuv420p, MP4 faststart | 205314 | 0.152s |
| Mobile | 390 x 844 | 40.000s | 320 / 320 | 8 fps | H.264, yuv420p, MP4 faststart | 152686 | 0.143s |

Observed recording wall times were 40.127s and 40.044s, consistent with real-time 40s playback. Neither file contains an audio stream. Each English WebVTT file has nine non-overlapping cues ending at 40.000s, within its video duration. Caption text identifies the example as fictional and explicitly states no presenter/narration. Caption windows match recorded actions: date at 4s, certainty at 8s, time at 10s, city typing at 12s, search at 15s, selection at 18s, calculate at 24s, result scroll at 29s.

Both actual calculation responses returned HTTP 200, lagna Gemini, moon_sign Sagittarius, doshas included and no doshas_locked field. Gemini and Sagittarius were also checked as visible within each captured final viewport. No email input, payment, account action, billed API or real customer record was used. No promise of independent numerical accuracy is inferred from this example.

### Verification Receipts

- artifacts/customer-experience/walkthrough/free-chart-recording-manifest.json: per-take action times, capture gaps/counts, actual response facts, request restrictions, FFprobe metadata and source fingerprints.
- artifacts/customer-experience/walkthrough/native-playback-verification.json: installed Chrome successfully plays both MP4s in a temporary native video player with controls, an English caption track, all nine cues and the correct active Gemini/Sagittarius cue at 32s; no playback error.
- artifacts/customer-experience/walkthrough/free-chart-{desktop,mobile}-{0-5,6,14,20,30,38}.jpg: six decoded frames per take, all nonblank by luminance range; beginning, typed-city/selection and result/poster frames were also visually inspected. Frames remain outside public source.
- artifacts/customer-experience/walkthrough/previous-take-verification: preserved interim QA frames, not final/public deliverables.
- node --check scripts/record-free-chart-walkthrough.mjs and the scoped whitespace check pass. node scripts/record-free-chart-walkthrough.mjs --verify-only re-verifies both final files without another calculation or recording.

### Recording Version and Explicit Limitations

Version: **current tested worktree; pending release SHA**. Base checkout commit: dfb774a972430790fa565dfe5d4529c2e5d3796f. Both final takes share recorded calculator/visible-UI fingerprint 54e774f1a3c13e5c4c9b8acb10a1c06617b87978eb3cee75a6bcb841281e0906, unchanged during each recording. The final manifests also report no broader source change during those takes. This is not a claim that the base commit contains these changes or that either video has been deployed. A release that alters the shown calculator/UI needs a refreshed clip or an explicit version decision.

The user's preference for a **natural presenter in the bottom-right is NOT fulfilled**. These are silent captioned browser recordings with no presenter, voice, actor or avatar, not a natural-presenter video. No overlay obscures the recorded application controls; native captions/controls belong to the eventual optional help-page player. The transcript supplies a non-video alternative. Unknown-time handling, approximate-time uncertainty and independent ephemeris/DST reference testing are not demonstrated or solved by this known-time clip. No commit, push or deployment was performed.
