# Evidence Register

Date: 2026-10-15, Asia/Dubai. Baseline production source: dfb774a972430790fa565dfe5d4529c2e5d3796f. Evidence is separated by source inspection, synthetic heuristics, mocked regressions, actual browser execution and release verification. No human interviews, conversion observations or willingness-to-pay results are claimed.

## Before Implementation

- Vercel list_deployments confirms READY production dpl_HDo6n8DPc1tjSfGTJ5XYY6S9pW3D from GitHub aarshvir/jyotish-ai main at the baseline SHA.
- Actual repository confirmed from git remote, commit history and matching deployed SHA. The chat's old Downloads path is absent. Older vedichour-v2 is a separate repository, not the deployed product.
- Primary browser harness: `node scripts/customer-experience-browser.mjs https://www.vedichour.com before`. 29 executed tasks: 14 public-route navigations at each of 1440x1000 and 390x844, plus one fictional anonymous chart API calculation. 27 basic navigation/API checks passed; /help was 404 at both sizes.
- Raw receipt: `artifacts/customer-experience/before/journeys.json`. Baseline screenshots are in that directory. Artifact paths are gitignored; no private account screenshots are published.
- Both free-chart time fields were actually observed as 12:00. Anonymous API returned Gemini rising, Sagittarius Moon and Uttara Ashadha for fictional New Delhi birth 1990-05-15, 09:30; doshas=null and doshas_locked=true. This confirms the undisclosed result gate, not generalized chart accuracy.
- Six official competitor receipts, dates and advertised-vs-tested limits are recorded in INDEPENDENT-REVIEWS/growth-competitors.md and MESSAGING-AND-PRICING.md. No competitor full journey was executed.

## Independent Roles

Six separately assigned AI review executions, not twenty reviewers or real users. Each recorded baseline judgments before seeing others' grades. Tools inherit the parent model but do not expose the resolved worker model; model identity is therefore unreported rather than guessed.

| Execution | Responsibilities | Record |
| --- | --- | --- |
| Copernicus | Product architect, UI/UX designer, frontend engineer, technical writer; later consent/privacy repair | public-experience.md |
| Pauli | Backend engineer, integration engineer, security reviewer, bug-triage reviewer; later walkthrough artifact | calculation-security.md |
| Zeno | Database architect, customer-support reviewer, QA engineer, lifecycle/email strategist | continuity-support.md |
| Euclid | Analytics/research reviewer, customer-acquisition researcher, financial-operations reviewer | research-operations.md |
| Chandrasekhar | Copywriter/SEO reviewer, social-content strategist, launch strategist, competitor-intelligence reviewer; acquisition/cost crosschecks | growth-competitors.md |
| Mendel | DevOps/release engineer and independent security/regression recheck | release-security.md |

These cover the twenty requested role responsibilities through grouped ownership. Role hats do not establish independent human research. Growth messages, campaigns and lifecycle emails remain drafts.

## Final Local Verification

- Final production build and typecheck passed after all source edits. Build includes lint with warnings only in unchanged legacy modules. Local Inngest signing key is absent; the existing webhook correctly fails closed. No signature guard was weakened. This is not confirmation of the production background-job configuration.
- Whole suite: 108 test files, **1,173 tests passed, zero failed, zero skipped**. `CALCULATOR_BASE_URL=http://127.0.0.1:3200`, installed Chrome and `ANALYTICS_CONSENT_BROWSER_TEST=1` enabled the optional browser fixtures. Raw JSON: `artifacts/customer-experience/final-unit-tests.json`. Database, payment, email and model providers in these regressions are isolated mocks.
- Primary final task run against the production build on port 3200: **33/33 passed**, eleven tasks at each of desktop 1440, mobile 390 and narrow 320. Includes actual free chart, seven-day opt-in save/refresh without recalculation/edit/clear, unknown-time refusal, ambiguous-city choice, injected 504 with actual-service retry, help search/device clear, closed offers/auth redirects, navigation, optional analytics choice/withdrawal, actual responsive video playback/captions/transcript, Kundli free summary and qualified compatibility without any full-generation request. Raw JSON: `artifacts/customer-experience/task-results.json`. This supersedes the earlier 21-case checkpoint, not an additive count.
- Final public sweep against the built app: **35/35 passed**, seventeen routes at desktop/mobile plus one fictional chart API request. Raw receipt: `artifacts/customer-experience/after-local/journeys.json`. It checks successful navigation, no fatal page errors and no horizontal overflow, not full customer understanding or accessibility.
- Final home and chart-result screenshots at 1440/390/320 were inspected. All evidence uses fictional inputs; no customer login, account creation, payment, email, lead or model-generation mutation occurred in these browser checks. Optional analytics requests in the consent task are intercepted, not submitted.
- Installed Chrome was used because bundled Playwright browsers were absent. Local Python ephemeris service was initially stopped; starting the existing service resolved local calculation availability. No source math change was needed.
- Primary commercial regression: 5 tests prove default closure, preserved authentication, no provider call or checkout draft write, no unavailable prices, and matching structured/assistant availability. Existing AI-visibility tests pass with explicit enabled-state fixtures.
- Python `test_lahiri_threads.py` and `test_sunrise_pair.py` pass against the installed Swiss Ephemeris. They test threaded Lahiri consistency and calendar/hour arithmetic, not independent predictive validity or all historical timezone cases.
- Calculator worker: 108 new regressions (including 7 browser tests with APIs mocked), 64 existing regressions, scoped lint and typecheck pass. Browser fixtures are not real-provider result proof; the separate fictional real calculation is recorded above.
- Public worker: 10 additional browser checks and source rendering checks; these are worker-reported supplementary executions, not folded into the primary final 33-task run. Continuity worker reports fourteen supplementary help/account browser checks.
- Independent release reviewer verified rollback bundles and scratch restoration: 1,914 original file-overlay files matched SHA-256, 150,460,562 total bytes, zero missing/different. Private values/hashes were not displayed. No database backup/restoration is claimed.
- All three independent release findings are closed: device privacy clearing omitted the calculator draft; saved-chart query failures masqueraded as empty collections; a legacy funnel Pixel helper bypassed the advertising-disabled boundary. Independent account export/delete failure checks also passed; all database/auth actions were mocked, no real customer data was queried or deleted.
- Two actual continuous 40-second desktop/mobile walkthroughs are integrated with English captions, posters and transcript. Playback was executed at all three widths. No narration or presenter was produced; the natural-presenter preference remains unfulfilled. License and recording provenance are supplied; no paid capacity was used.
- Three foundational blog articles plus the /hora explanation now distinguish free chart facts, traditional interpretation, example timing and unavailable new paid forecasts. Search/SEM/social/lifecycle proposals remain drafts, not launched campaigns.

## Synthetic Assessment

400 distinct scenarios and 400 baseline scorecards, exactly 100 in each A/B/C/X stratum, twenty contexts and declared ten-dimension weights. Reproducible generation and `--check` verify counts, partitions, source references, CSV roundtrips and aggregates. Baseline heuristic 55.87 at 88.875% evidence coverage. Unknown visual/runtime dimensions are not silently graded. This is not a satisfaction, conversion, demand or 95+ score.

Checksum-bound C1 local reassessment updates 326 scenario/dimension cells. Effective composite **58.38**, newly evidenced rubric weight **7.75%**, judgment bounds **[41.15, 74.28]**. Other cells explicitly inherit baseline values/uncertainty or remain unknown. This does not claim all 400 scenarios were executed, that the full experience was freshly graded, or that real customers were observed. Receipt: RELEASES/02-local-verification.json; reproducible rules and condition scopes: SCORING.md.

## Release Boundary

Production release `a5d00e066a6b735574652bf18da6985b47e0a47a` is READY on Vercel `dpl_5QU4qs6gkuuCFzw53Rbj8pvrzTMD`, assigned to www.vedichour.com. **33/33 live task checks and 35/35 live route/API checks passed** against the actual alias. Exact versions, counters, fixtures and limits are recorded in RELEASES/03-live-verification.md. These repeat the local scopes in a different environment; do not add them together as unique scenarios or real people.

Final source/deployment IDs, production build, final-diff review and live checks are recorded in RELEASES. A passing local test is not a deployed or live-verified state. Account ownership/export/deletion have isolated regression evidence, not live destructive tests or a verified database restore. Real billing/provider eligibility, SMTP delivery and broad independent numerical timezone validation remain separately scoped; no real customer data was queried or deleted for this assessment.
