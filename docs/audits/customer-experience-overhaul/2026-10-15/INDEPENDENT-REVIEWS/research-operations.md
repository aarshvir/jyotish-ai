# Independent Research and Operations Review

Recorded 2026-10-15, before reading other reviewers' grades or assigning scenario scores. Scope: baseline source `dfb774a972430790fa565dfe5d4529c2e5d3796f`, governing attached brief and BRIEF.md. This is one independently assigned AI reviewer covering three roles, not three reviewers or twenty humans. Inherited model: unresolved; no available tool reports the resolved model of this worker. No customer records queried, interviews performed, emails sent or checkout actions initiated.

## Analytics and Research Judgment

1. The homepage's free-today-windows CTA routes to a chart-facts calculator, not a personalized hourly forecast. Source: `src/components/landing/Hero.tsx`, `src/lib/pricing.ts`, `src/components/tools/ChartTool.tsx`. This is a promise/action mismatch, independent of styling.
2. Free calculator verdicts are partly email-gated. The dosha reveal request writes to newsletter_subscribers without a separate marketing choice in the shown gate. Sources: ChartTool.tsx and `src/app/api/tools/chart/route.ts`. Treat the resulting lead count as gated disclosure, not proof of demand or freely chosen newsletter acquisition.
3. The unknown-time shortcut asserts Moon sign, nakshatra and Gun Milan remain accurate at noon. Sources: `src/components/forms/BirthDetailsInput.tsx`. This broad claim is not justified by inspected source. Noon also initializes several forms before an explicit choice. Exact-time-sensitive outputs need uncertainty propagation and boundary testing, not reassurance.
4. A successful calculator writes an onboarding draft into sessionStorage, but the calculator itself initializes from defaults; a saved-input claim is not a saved-result or cross-device retrieval guarantee. Sources: ChartTool.tsx and `src/lib/onboard/draft.ts`. Separately, the quiz does have restore and returning-report prefill logic; do not call all continuity absent.
5. Source analytics distinguish calculator_submitted, calculator_result and calculator_failed. Sources: ChartTool.tsx and PostHogProvider.tsx. Instrumentation exists, but event delivery, denominators, consent, attribution and actual completion rates have not been verified. No conversion or retention figure can be inferred from code comments.

## Customer-Acquisition Judgment

1. Keep three overlapping groups within one product: first chart exploration, everyday timing and return use, relationship or chart-factor exploration. Privacy, fluency and accessibility are cross-cutting needs, not new funnels.
2. Inspect intent-matched calculator, article, sample, pricing and private-result entries separately. Homepage clarity cannot stand in for an article-to-tool bridge or an expired report deep link.
3. Existing robots, assistant text, structured offers and canonical metadata are useful source assets. They are readiness signals only, not verified ranking, traffic or assistant recommendations. `src/lib/seo/aiVisibility.ts` repeats the full-results/no-sign-up claim despite the dosha gate.
4. Before any paid acquisition, align ad promise, entry page, required inputs, free result and next action. Social, assistant and paid channels in the dataset are hypotheses, not observed referrals. Avoid adding separate persona pages or twenty thin articles as a proxy for conversion work.
5. Sample excerpts are labelled sample prose, not customer testimonials. Preserve this distinction; the legacy Testimonials component name is not evidence of fabricated customer quotes.

## Financial-Operations Judgment

1. Monthly/yearly price configuration and legacy one-time adapters coexist. Public pricing says subscriptions with manual renewal; legacy plans remain in `src/lib/ziina/server.ts`. Further baseline inspection confirms `src/app/api/ziina/create-intent/route.ts` rejects retired one-time sales with SUBSCRIPTION_ONLY (except a free standalone unlock). Legacy definitions alone are not evidence those plans can be purchased. Provider eligibility and complete entitlement behavior are still unverified.
2. UAE business licence/permit and payment-provider eligibility remain unresolved by owner instruction. Do not activate real-money checkout or infer approval from an adapter, token, receipt or passing test.
3. `docs/PRICING_RESEARCH.md` contains historical cost estimates and unmeasured Ask-your-report assumptions; these are not independently measured unit economics for this review. Refund costs, support time, failed generations, retention and willingness to pay remain unknown.
4. Source contains owner-scoped account exports/deletion and payment reconciliation safeguards. Do not erase these capabilities from the inventory merely because they are not discoverable in the inspected dashboard. UI discoverability, schema consistency, partial deletion semantics and real provider behavior still need verification with isolated data.

## Independent Conclusion

Highest leverage is honest free-result availability, explicit birth-time uncertainty, clear useful output and dependable continuation. Existing calculation, sample, auth, saved-chart and recovery modules should be reused. No defensible 95+ experience claim, commercial readiness claim or verified demand claim follows from this source audit. Scores will be synthetic source-audited heuristics; rendered visual quality will remain ungraded. Post-implementation reassessment is pending primary-worker verification.

Evidence counts for this reviewer: 0 interactive browser journeys executed; 0 real users observed; 3 public-page text retrievals (homepage, pricing, free-kundli), not browser tests. Public text may be cached and is not release-version proof. Other workers' actual counts remain unknown until their handoff.

## Subsequent Scoped Corroboration

Primary handoff supplied `artifacts/customer-experience/before/journeys.json`, which this reviewer read after freezing the independent findings. It records 29 browser tasks (28 route navigations plus one fictional chart API), 27 basic passes, two /help 404s, initial 12:00 on free-kundli at both widths, and a 200 API response with doshas_locked=true/doshas=null. These corroborate findings 1-4 and the missing dedicated help route; they do not establish all 400 synthetic tasks were executed or the full funnel works. No grade from another reviewer was consulted.

At the first handoff the orchestration count was 5 separate AI reviewers; primary subsequently added Mendel for release/security, making the actual count 6. Twenty role responsibilities are not twenty reviewers. Resolved inherited model remains unreported. Local source now has a default-disabled commercial availability gate; this does not resolve UAE eligibility and is pending primary versioned verification before post-implementation scoring.

## Post-Source Audit, No Numeric Reassessment Yet

After independent baseline judgments were frozen, inspected ChartTool, BirthDetailsInput, public chart route, source validation/request/storage helpers, public entry, commercial availability and help. Source now removes the default noon and email wall, requires explicit time certainty and city choice, labels approximate results provisional, opts into seven-day device saving, restores without recomputation, invalidates results on edits and provides input-preserving errors. Unknown time is honestly refused, not converted into an unsupported date-only chart. Source-only score/evidence columns remain immutable.

Primary reports two local desktop core tasks passed with a real local calculation backend: known chart (Gemini/Sagittarius), optional save, refresh without extra API, edit and clear; injected 504 then real retry without lost inputs or default saving. Primary also reports unknown/no-API, ambiguous-city choice/edit invalidation and default-off/authenticated mutation guard tests passed. These are not all synthetic scenarios, numerical reference validation, real provider outage, real payments or real users. Copernicus reports 10 standalone desktop/mobile checks; older counts and differing mocks/scopes are not summed. Final receipts/version still pending.

Later primary EVIDENCE.md and raw task-results.json establish a newer 21/21 local run at 1440/390/320 (2026-10-14T20:35:34.486Z). It replaces, not adds to, the earlier two-task checkpoint. Primary's identity map clarifies Copernicus is public-experience/privacy and its 10 checks are supplementary public/browser work; Pauli owns the calculator's 7 mocked browser regressions. No final source/build/deployed approval is implied; no summed unique-task total is claimed.

Mendel's release review adds a material concern: saved-chart API failures can still be presented as empty account collections; a successful HTTP/array response does not establish an actually empty account. Privacy policy/tracking contradictions and consent gating are assigned to Copernicus. Device-clearing helper assertions were reported independently, but final privacy-clear/auth-error/consent task verification remains pending. No broad trust-score upgrade is made for these unfinished areas.

The generator now supports a registered --post rule protocol requiring final versioned source manifests, checksum-bound executed check selectors and scoped screenshots. It caps source-affordance grades at 75, keeps visual/a11y unknown and labels inherited baseline dimensions in any composite. Missing evidence produces blank post scores, not invented progress.

## Twenty-Role Map

This maps responsibilities, not additional independent executions. Worker identity is the review artifact unless a trusted handoff supplied a name; no other names or model IDs are invented.

| Role | Responsible worker/review | Coverage evidence/status |
|---|---|---|
| 1 Product architect | Copernicus, public-experience.md | Independent baseline and public implementation |
| 2 UI/UX designer | Copernicus, public-experience.md | Public layout/copy review; not a user study |
| 3 Database architect | Zeno, continuity-support.md | Ownership/schema/retrieval boundaries |
| 4 Frontend engineer | Copernicus, public-experience.md | Public components and responsive source |
| 5 Backend engineer | Pauli, calculation-security.md | Calculator handlers and validation |
| 6 Integration engineer | Pauli, calculation-security.md | Ephemeris/geocode/request contracts |
| 7 Security reviewer | Pauli plus Mendel, release-security.md | Initial calculator safety and independent release regression |
| 8 QA engineer | Zeno, continuity-support.md plus primary | Scoped regressions/browser checks; final suite pending |
| 9 DevOps/release engineer | Mendel plus primary | Independent release/rollback review and primary build/deploy ownership |
| 10 Technical writer | Copernicus, public-experience.md | Customer wording and entry/task explanation |
| 11 Copywriter/SEO reviewer | Chandrasekhar, growth-competitors.md | Messaging, metadata and editorial source review |
| 12 Social-content strategist | Chandrasekhar, growth-competitors.md | Draft-only, unsent content |
| 13 Launch strategist | Chandrasekhar, growth-competitors.md | Proposed launch gates, not launch execution |
| 14 Customer-acquisition researcher | Euclid, research-operations.md, growth crosscheck | Synthetic channel/intent assessment; no measured acquisition |
| 15 Lifecycle/email strategist | Zeno, continuity-support.md, growth draft crosscheck | Draft-only return/recovery; no sent email |
| 16 Customer-support reviewer | Zeno, continuity-support.md | Task help and account-recovery contracts |
| 17 Bug-triage reviewer | Pauli, calculation-security.md | Birth/calculation/gating issues and priorities |
| 18 Analytics/research reviewer | Euclid, research-operations.md | 400 synthetic scenarios, frozen rubric and evidence coverage |
| 19 Financial-operations reviewer | Euclid, research-operations.md, growth crosscheck | Eligibility/cost uncertainty; no commercial activation |
| 20 Competitor-intelligence reviewer | Chandrasekhar, growth-competitors.md | Six official advertised/text references; competitor journeys untested |

Six distinct worker review artifacts now exist: public-experience, calculation-security, continuity-support, growth-competitors, research-operations and release-security. Primary orchestration does not imply an additional independent-review count. Private customer records were never queried by this reviewer; supplied browser evidence uses fictional data.
