# Release 01: Production Verification

Review date: 2026-10-15, Asia/Dubai. Source release is published, deployment READY, and the bounded live acceptance checks below all passed. A READY deployment is not substituted for a successful journey.

## Exact Versions

- Tested product source: `a5d00e066a6b735574652bf18da6985b47e0a47a`, GitHub aarshvir/jyotish-ai main.
- Release tag: `release/customer-experience-2026-10-15`.
- Vercel production deployment: `dpl_5QU4qs6gkuuCFzw53Rbj8pvrzTMD`, READY, target production, same exact GitHub SHA.
- Immutable deployment URL: https://jyotish-frvc1qn6y-aarshs-projects-6294c426.vercel.app
- Confirmed assigned production aliases: https://www.vedichour.com and https://vedichour.com.
- Baseline rollback source: `dfb774a972430790fa565dfe5d4529c2e5d3796f`, tag `rollback/production-before-overhaul-2026-10-15`, Vercel `dpl_HDo6n8DPc1tjSfGTJ5XYY6S9pW3D`.
- Original local rollback source: `241610c7f90c58c9340698fba5c3649751c7f71c`, tag `rollback/customer-experience-2026-10-15`.
- All three tags were pushed with main. Private sibling backup instructions and restored file verification remain the authoritative local rollback record.

## Local Acceptance

Final product source passed production build, typecheck and lint (unchanged legacy warnings only), 1,173 automated checks across 108 files with zero failures/skips, 33 browser tasks at desktop/mobile/narrow widths and 35 public route/API checks. All significant independent release findings are closed. See EVIDENCE.md and 01-free-experience.md.

Frozen local task JSON and screenshots are under `artifacts/customer-experience/final-local/`; the local route sweep is `artifacts/customer-experience/after-local/journeys.json`. Post-scoring receipts use these archived files so a subsequent live run cannot overwrite the local evidence.

Final receipt-builder and post-assessment `--check` passed independently at handoff. The C1 manifest binds 789 source/test/configuration files, 44 individual executed-check pointers and six archived PNGs. It validates 400 distinct scenarios, twenty contexts, ten weights totaling 100, 400 scorecards, 24 capabilities, six reviewers, zero real users and zero duplicates. The narrowly reassessed composite is 58.38, not a measured 95+ customer score; only 7.75% of rubric weight has new scoped evidence.

## Live Acceptance

- **33/33 browser task executions passed**, zero failed, flaky or skipped, started 2026-10-14T21:37:57.477Z (15 October Dubai), duration 67.10 seconds. Eleven tasks each at 1440/390/320 against https://www.vedichour.com. Raw: `artifacts/customer-experience/live-task-results.json`.
- Actual production known-chart calculation, seven-day opt-in draft/result restore without another calculation, correction and clearing passed. Unknown time made no calculation request; city selection/edit, input-preserving synthetic failure followed by real-production retry, task help and device clearing passed.
- Pricing/start/assistant availability are closed consistently; dashboard requests redirect an anonymous visitor to login. Kundli and compatibility free submissions returned actual deterministic results and made zero full-generation requests. Native desktop/mobile walkthrough playback, correct video dimensions, captions and transcript passed at all three widths.
- Optional usage analytics starts off; explicit choice and withdrawal work. This test intercepts first-party event requests, blocks external analytics and confirms GA/Meta scripts are absent. No actual marketing/analytics event submission is claimed by the consent test.
- **35/35 public route/API checks passed**, seventeen routes each at desktop/mobile plus one fictional chart API request. Raw: `artifacts/customer-experience/live/journeys.json`. No fatal page errors, horizontal overflow or broken images were observed. This is a navigation/rendering check, not full accessibility or human comprehension proof.
- Seven additional live server-boundary assertions passed: no prices/new offers, legacy quiz path returns the unavailable notice without birth inputs, corrected /hora claims, full assistant text matches closure, and unknown/invalid fictional births return 422/400 with no-store. Raw: `artifacts/customer-experience/live/server-boundaries.json`; reproducible with `node scripts/customer-experience-live-check.mjs`. These are supplementary HTTP assertions, not seven more full journeys.

Checks use fictional birth details only, no customer login, provider purchase, full reading generation, deletion, newsletter enrolment or marketing send. No real commercial approval is inferred from deployment access. Primary local and live counters are separate environment runs of the same scenarios; they are not 68 unique user needs or 400 browser-executed scenarios.

## Boundaries

New paid checkout defaults off. Existing report/account access and entitlement checks remain in place. No database migration or real customer mutation was part of this release. Isolated mocked owner/account/payment tests do not prove live billing, real mail delivery, all retained-provider data erasure or database recovery. Full independent numerical/timezone reference validation, real-user observations and presenter narration remain open.

Subsequent commits limited to audit/scoring documentation and reproducibility helpers may add the verification handoff. They do not change the tested application files; source equivalence must be checked before publishing that follow-up. Product source and documentation revisions are not interchangeable evidence.
