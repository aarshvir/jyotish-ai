# Current State

Assessment date: 2026-10-15, Asia/Dubai. Confirmed checkout: `C:\Users\user\Projects\jyotish-ai`. Repository: https://github.com/aarshvir/jyotish-ai. The original Downloads context is stale. Production baseline `dfb774a972430790fa565dfe5d4529c2e5d3796f` and deployment `dpl_HDo6n8DPc1tjSfGTJ5XYY6S9pW3D` are inherited evidence from BRIEF.md, not independently re-queried deployment metadata. Other workers' unpublished edits are excluded from baseline judgments using git show.

## Baseline Product and Strategy

VedicHour provides Vedic chart-fact calculators, samples and educational content; source also implements subscriber forecasts, written Kundali readings, compatibility breakdowns and account retrieval. Calculations are intended to be deterministic; generated commentary is a separate interpretive layer. Astronomy does not validate astrological prediction. The coherent provisional audience is A: first chart explorers; B: everyday timing and returning readers; C: relationship or chart-factor explorers. X is a cross-cutting assessment group, not a fourth commercial product.

The best source-supported free use is a visitor with known date/time/place seeking a named chart fact. Unknown time, dosha verdict gates, free-hourly-window expectations and long-gap return retrieval create material limitations. Existing source does not establish customer demand, willingness to pay or reliable prediction.

## Baseline Journey Gaps

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

## Final Release State

Primary final handoff: product source `a5d00e066a6b735574652bf18da6985b47e0a47a` is deployed READY as `dpl_5QU4qs6gkuuCFzw53Rbj8pvrzTMD` on https://www.vedichour.com. The source-bound receipt and post-score reproduction checks passed. Baseline judgments above remain historical, not descriptions of unresolved current bugs. RELEASES/03-live-verification.md records exact production and rollback versions.

Primary's baseline browser artifact is [journeys.json](../../../../artifacts/customer-experience/before/journeys.json), executed 2026-10-14T20:12:35.967Z (2026-10-15 in Asia/Dubai). It records zero real users, account/payment mutations and model-generation calls. Basic pass checks include response success, no document overflow and no fatal page error. They do not measure comprehension, contrast, keyboard order, output usefulness or full form completion. The single API returned Gemini rising, Sagittarius Moon and Uttara Ashadha; these are observed response fields, not independently validated astronomical accuracy.

Current source requires `COMMERCIAL_CHECKOUT_ENABLED` exactly `true`; otherwise new checkout and upgrade intents are disabled before provider calls or writes. Actual live pricing/start/quiz/assistant responses confirm unavailable new purchases. Authenticated mutation behavior is verified with isolated mocks, not real payments. Commercial/provider eligibility remains unresolved; deployment does not resolve it.

## Implemented Source Follow-Up

These observations do not alter baseline scores. The following table preserves checkpoint source anchors; final source and individually passed-check bindings are in RELEASES/02-local-verification.json. Its manifest binds 789 C1 source/test/configuration files, 44 checks and six screenshots. Later document edits do not change the tested application. The final verification record below supersedes the table's earlier pending/checkpoint states.

| Affordance | Working source observation | Scoped check evidence | Remaining limit |
|---|---|---|---|
| Chart-first entry | Hero.tsx:14 names Create my free chart; copy describes facts, not free personal timing | Source read; primary's known-chart desktop core task reported passed | Entry comprehension and final deployed copy not established |
| Time certainty | BirthDetailsInput.tsx:108 requires certainty; lib/tools/birth.ts:43 refuses unknown/no silent noon; ChartTool.tsx:189 labels approximate as one estimate, not interval | Primary reports unknown invokes no API; Copernicus has mocked UI/validation cases | No interval-aware result or reference ephemeris/DST accuracy proof |
| Ambiguous city | BirthDetailsInput.tsx:155 exposes candidate choice; edits cancel lookup and invalidate coordinates | Primary reports two-city choice required/edit invalidation passed | Geography/timezone edge cases not generally validated |
| Ungated free result | api/tools/chart/route.ts:28 no longer collects leads/auth-gates doshas; ChartTool no email wall | Known-chart real local backend Gemini/Sagittarius passed, per primary; route tests mock transport and prohibit lead writes | One sample does not establish numerical accuracy or all factor results |
| Optional device save | ChartTool.tsx:62 restores result; :171 offers opt-in draft/result up to seven days; lib/tools/storage.ts uses 7-day TTL and scoped key | Primary desktop core task passed opt-in save/refresh without extra API/edit-clear-result/clear-key | Expiry enforced on access, not background erase; not account/cloud/cross-device persistence |
| Error recovery | ChartTool.tsx:142/:153 retains inputs for calculation/network errors | Injected 504 followed by real retry passed, no default opt-in save | This is an injected failure, not an observed provider outage or every recovery state |
| Commercial guard | api/ziina/create-intent/route.ts:42 and api/ziina/upgrade/route.ts:31 deny unavailable sales | Primary reports default-off module/authenticated mutation mocks deny before provider/DB write | Mocks do not prove provider eligibility or live environment state |
| Task help | Dedicated help search, thirteen articles and explicit free/existing-access links | Final local/live help search, no-results/reset and device-clear tasks passed | Baseline 404 is historical; general screen-reader/human help-success unobserved |
| Privacy and account recovery | Consent/policy aligned; device-clear, saved empty/error/stale and account integrity fixes reviewed | Final consent UI tasks passed; isolated ownership/export/delete/retrieval mocks passed; all three independent findings closed | No regulatory compliance, live destructive action or full authenticated-customer recovery claim |

## Verification Counters

| Record | Count | Scope/status | Deduplication |
|---|---:|---|---|
| Production-before-overhaul browser artifact | 29 | 28 basic route navigations + one fictional chart API; 27 basic passes | Fixed baseline record; not full funnels |
| Copernicus/public-experience supplementary checks | 10 reported | Public browser/layout/source checks; dependencies and final binding in owner evidence | Do not label as ten real-backend calculations or Pauli's mocked suite |
| Pauli/calculation-security mocked browser regressions | 7 reported | Within 108 new regressions; API dependencies mocked | Different scope from supplementary10 and real primary tasks; not added |
| Primary final local tasks | 33 | final-local/task-results.json: expected=33, unexpected/skipped/flaky=0; 11 tasks at each 1440/390/320 against production build | Replaces earlier 2/21-task checkpoints, not additive |
| Earlier primary desktop core tasks | 2 historical, superseded | Known chart/save/refresh/edit/clear and injected-504/real-retry | Not added to primary21 |
| Commercial mutation regressions | 5 reported | Default-off/authenticated guards and availability consistency; mocked providers/writes | Unit/contract checks, not browser tasks or real billing |
| Primary final whole suite | 1,173 | 108 files, zero failed/skipped, including 7 mocked calculator browser fixtures and analytics browser fixture | Unit/mock scopes, not additional real users |
| Primary final local route/API sweep | 35 | Seventeen public routes at desktop/mobile plus one fictional chart API; all passed | Separate navigation/render scope |
| Primary final live tasks | 33 | Same eleven task scopes at 1440/390/320; all passed against actual production alias | Repeated local scenarios in live environment, not unique additional needs |
| Primary final live route/API sweep | 35 | Seventeen routes at desktop/mobile plus fictional chart API; all passed | No fatal page errors, overflow or broken images observed |
| Additional live server boundaries | 7 | Closed offers/legacy quiz/assistant copy and invalid/unknown birth rejection; all passed | Supplementary HTTP assertions, not full journeys |
| Real users / this reviewer's executed browser tasks | 0 / 0 | No private customer queried | Never infer users from scenarios or browser runs |

No summed unique browser-task count is asserted. Frozen local artifacts are archived under artifacts/customer-experience/final-local; live results have separate receipts. Full visual/contrast/screen-reader validation remains unknown. Post grades change 326 cells across 117 scenarios, not all 400 scenarios. Effective scoped composite is 58.38 versus baseline 55.87, with only 7.75% newly evidenced rubric weight; other cells inherit baseline uncertainty. This is not observed satisfaction or a 95+ result.

All three independent release findings are closed: calculator privacy clearing, failed saved-chart reads shown as empty and the legacy Pixel bypass. Account export/delete failures are tested with isolated mocks, not real erasure. Optional tracking defaults off; GA/Meta remains disabled. Two actual captioned 40-second walkthroughs are live, without narrator/presenter. Thirteen searchable help articles, foundational copy repairs and free-only metadata are live. Growth campaigns remain drafts. Source/file rollback restored and verified; database restoration is not claimed.

The primary identity map confirms Copernicus=public/privacy, Pauli=calculation/security, Zeno=continuity/support, Euclid=research/operations, Chandrasekhar=growth and Mendel=release/security. Six AI reviewers cover twenty responsibilities, not twenty people. Their inherited resolved models remain unreported. The small real-user study is proposed, with zero participants observed so far.
