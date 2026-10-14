# Current State

Assessment date: 2026-10-15, Asia/Dubai. Confirmed checkout: `C:\Users\user\Projects\jyotish-ai`. Repository: https://github.com/aarshvir/jyotish-ai. The original Downloads context is stale. Production baseline `dfb774a972430790fa565dfe5d4529c2e5d3796f` and deployment `dpl_HDo6n8DPc1tjSfGTJ5XYY6S9pW3D` are inherited evidence from BRIEF.md, not independently re-queried deployment metadata. Other workers' unpublished edits are excluded from baseline judgments using git show.

## Product and Strategy

VedicHour provides Vedic chart-fact calculators, samples and educational content; source also implements subscriber forecasts, written Kundali readings, compatibility breakdowns and account retrieval. Calculations are intended to be deterministic; generated commentary is a separate interpretive layer. Astronomy does not validate astrological prediction. The coherent provisional audience is A: first chart explorers; B: everyday timing and returning readers; C: relationship or chart-factor explorers. X is a cross-cutting assessment group, not a fourth commercial product.

The best source-supported free use is a visitor with known date/time/place seeking a named chart fact. Unknown time, dosha verdict gates, free-hourly-window expectations and long-gap return retrieval create material limitations. Existing source does not establish customer demand, willingness to pay or reliable prediction.

## Main Journey Gaps

- E01/E02/E03: homepage free-today-windows action goes to chart facts; subscribers get hourly timing. A visitor can mistake the example or chart summary for a free personal forecast.
- E04/E05/B02: form defaults and noon shortcut lack durable uncertainty semantics, and the help overstates precision of Moon/nakshatra/Gun Milan without exact time. The API does not receive that uncertainty state. Primary browser evidence observed initial 12:00 on free-kundli at both 1440 and 390 widths.
- E03/E06/B01: free dosha verdicts have an email/auth gate. Giving an address writes a newsletter record; chart disclosure and marketing permission are not distinguished in this gate. One fictional browser API call returned 200 with doshas_locked=true and doshas=null. No email reveal or lead mutation was executed.
- E07/E08: successful calculators hand birth details to a session draft, but calculator fields/results do not restore from it. Quiz restoration is a separate, existing capability. A device-local input draft is not durable saved-result retrieval.
- E09/E10/E11: public subscription pricing is configured; one-time sales are rejected. A payment adapter and published price are not evidence of UAE eligibility or an authorized sale.
- E12/E13/E14: account chart retrieval, owner-scoped export and guarded deletion exist in source. Schema presence, customer discoverability and complete execution remain unverified.
- E15/E16/E17: trust/method pages, crawler boundaries and analytics exist. No ranking, assistant referral, conversion, retention or consent-compliance result is claimed.
- E18/E19/E20/B03: recovery/auth/progress infrastructure exists; task-specific error announcements, interruption recovery and cross-device flows still need execution evidence. The baseline /help route returned 404 at both tested widths.

## Availability and Evidence

CAPABILITY-MATRIX.csv distinguishes source-working, partial, proposed and unverified. Deployment configuration is unknown unless independently checked; a configuration requirement is not itself evidence of an unconfigured service. The script-generated source evidence registry in SCORING.md provides exact baseline path/line anchors, matching text and SHA256 blob digests; SCORECARDS.csv references those IDs for each dimension.

Public text was retrieved from [homepage](https://www.vedichour.com/), [pricing](https://www.vedichour.com/pricing) and [free Kundli](https://www.vedichour.com/free-kundli). It corroborates offer structure but may be cached; retrieval is not interactive browser testing or proof of the deployed commit. Source scoring does not depend on cached web wording.

## Counts and Limits

- Synthetic scenarios: exactly 400, 100 each A/B/C/X; 20 meaningful contexts, five tasks and four substantive states each.
- Independently assigned reviewers: 6 separate AI reviewers reported by primary, including Mendel's added release/security review; this artifact's worker covers analytics/research, acquisition and financial operations. Twenty responsibilities are mapped across those workers plus primary orchestration, not twenty reviewers or humans. All resolved inherited models remain unreported.
- Interactive browser tasks executed by this reviewer: 0. Primary supplied 29 real browser tasks: 28 public route navigations (14 routes x desktop1440/mobile390) plus one fictional New Delhi 1990-05-15 09:30 public chart API request. Basic passes: 27; /help failed twice. No full funnel/account/payment task is proved. Public text retrievals by this reviewer: 3. Real users observed: 0.
- Inherited worker model: unresolved; resolved runtime model not reported by available tools.
- Product-source changes, campaigns, payment activation, customer-data queries and commits by this reviewer: none.

## Release State

Rollback artifacts are described in BRIEF.md; a source backup is not a database restoration test. Post-implementation source reassessment is pending versioned primary verification. No unpublished change is marked tested, deployed or live here. Other owners supply EVIDENCE.md, release evidence, exact implementation inventory, browser counts and growth outputs.

Primary's baseline browser artifact is [journeys.json](../../../../artifacts/customer-experience/before/journeys.json), executed 2026-10-14T20:12:35.967Z (2026-10-15 in Asia/Dubai). It records zero real users, account/payment mutations and model-generation calls. Basic pass checks include response success, no document overflow and no fatal page error. They do not measure comprehension, contrast, keyboard order, output usefulness or full form completion. The single API returned Gemini rising, Sagittarius Moon and Uttara Ashadha; these are observed response fields, not independently validated astronomical accuracy.

Current local source inspection finds `src/lib/commercial/availability.ts` requiring `COMMERCIAL_CHECKOUT_ENABLED` exactly `true`, otherwise disabled; create-intent and upgrade routes check it before starting checkout. This is an implemented local guard, not baseline production behavior, payment-provider approval or proof the correct live environment is disabled. Verification/release status remains pending primary handoff. Eligibility remains unresolved, irrespective of this reversible local safeguard.

## Working-Source Follow-Up

These observations follow completed baseline judgments and do not alter baseline scores. Source is still changing; path/line locations are working-checkpoint anchors, not a final version or deployed claim. Post scoring requires primary's final source manifest/version and checksum-bound receipts/screenshots in the documented --post mode.

| Affordance | Working source observation | Scoped check evidence | Remaining limit |
|---|---|---|---|
| Chart-first entry | Hero.tsx:14 names Create my free chart; copy describes facts, not free personal timing | Source read; primary's known-chart desktop core task reported passed | Entry comprehension and final deployed copy not established |
| Time certainty | BirthDetailsInput.tsx:108 requires certainty; lib/tools/birth.ts:43 refuses unknown/no silent noon; ChartTool.tsx:189 labels approximate as one estimate, not interval | Primary reports unknown invokes no API; Copernicus has mocked UI/validation cases | No interval-aware result or reference ephemeris/DST accuracy proof |
| Ambiguous city | BirthDetailsInput.tsx:155 exposes candidate choice; edits cancel lookup and invalidate coordinates | Primary reports two-city choice required/edit invalidation passed | Geography/timezone edge cases not generally validated |
| Ungated free result | api/tools/chart/route.ts:28 no longer collects leads/auth-gates doshas; ChartTool no email wall | Known-chart real local backend Gemini/Sagittarius passed, per primary; route tests mock transport and prohibit lead writes | One sample does not establish numerical accuracy or all factor results |
| Optional device save | ChartTool.tsx:62 restores result; :171 offers opt-in draft/result up to seven days; lib/tools/storage.ts uses 7-day TTL and scoped key | Primary desktop core task passed opt-in save/refresh without extra API/edit-clear-result/clear-key | Expiry enforced on access, not background erase; not account/cloud/cross-device persistence |
| Error recovery | ChartTool.tsx:142/:153 retains inputs for calculation/network errors | Injected 504 followed by real retry passed, no default opt-in save | This is an injected failure, not an observed provider outage or every recovery state |
| Commercial guard | api/ziina/create-intent/route.ts:42 and api/ziina/upgrade/route.ts:31 deny unavailable sales | Primary reports default-off module/authenticated mutation mocks deny before provider/DB write | Mocks do not prove provider eligibility or live environment state |
| Task help | app/help/page.tsx:16 renders task search and free/help links | Working source exists; final task/help receipt pending | Baseline /help 404 remains historical; no general screen-reader/help-success claim |
| Privacy and account recovery | Consent/policy repair assigned Copernicus; Mendel reports scoped device-clearing helper fix and saved-chart empty/error risk | Final privacy-clear/auth-error/consent-gating tests pending | No privacy-compliance or complete account-recovery assertion |

## Verification Counters

| Record | Count | Scope/status | Deduplication |
|---|---:|---|---|
| Production-before-overhaul browser artifact | 29 | 28 basic route navigations + one fictional chart API; 27 basic passes | Fixed baseline record; not full funnels |
| Copernicus/public-experience supplementary checks | 10 reported | Public browser/layout/source checks; dependencies and final binding in owner evidence | Do not label as ten real-backend calculations or Pauli's mocked suite |
| Pauli/calculation-security mocked browser regressions | 7 reported | Within 108 new regressions; API dependencies mocked | Different scope from supplementary10 and real primary tasks; not added |
| Primary local tasks, latest checkpoint | 21 | task-results.json 2026-10-14T20:35:34.486Z: expected=21, unexpected/skipped/flaky=0; 7 tasks at each 1440/390/320 | Replaces earlier 2-task desktop checkpoint; does not resolve cross-run overlap |
| Earlier primary desktop core tasks | 2 historical, superseded | Known chart/save/refresh/edit/clear and injected-504/real-retry | Not added to primary21 |
| Commercial mutation regressions | 5 reported | Default-off/authenticated guards and availability consistency; mocked providers/writes | Unit/contract checks, not browser tasks or real billing |
| Privacy-clear/auth-error/consent repair | Count pending | New source changes awaiting final tests | Not counted as passed |
| Real users / this reviewer's executed browser tasks | 0 / 0 | No private customer queried | Never infer users from scenarios or browser runs |

No summed unique browser-task count is asserted. Artifacts may be overwritten or refer to different working checkpoints; only final checksum/version-bound receipts authorize post grades. Primary-reported local screenshot widths 1440/390/320 and no-overflow checks cover narrow layout conditions, not contrast or screen-reader validation. All post numeric cells remain blank now.

EVIDENCE.md and RELEASES/01-free-experience.md are now created by primary. The release record explicitly says local verification in progress/not deployed; its final source version/manifest and final test/build receipt are not yet available. The primary identity map confirms Copernicus=public experience/privacy, Pauli=calculation/security, Zeno=continuity/support, Euclid=this research/operations execution, Chandrasekhar=growth and Mendel=release/security. Inherited model identity remains unreported.
