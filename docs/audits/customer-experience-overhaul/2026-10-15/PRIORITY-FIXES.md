# Priority Fixes

Eight shared improvements, based on immutable production baseline dfb774a and scoped browser evidence B01-B04. These are recommendations/acceptance criteria, not this reviewer's product implementation. Local changes by other owners await versioned verification. Effort estimates are rough engineering person-days, not commitments; no guaranteed score gains. Scenario selectors refer to PERSONAS-AND-SCENARIOS.csv and can overlap.

## P1 - Align the Offer and Commercial Availability

- Problem/evidence: E01/E02 promise free personal windows but route to facts. E09/E11 and U03 show pricing/adapter availability cannot establish permitted commerce.
- Affected scenarios: task_kind discover/pricing/forecast/deep, plus verdict availability decisions; all channels, especially first-use/hypothetical ad/social/assistant arrivals.
- Root cause: historical forecast-first positioning and changing entitlement paths leave different meanings of free on adjacent surfaces.
- Solution: lead with free calculated chart facts; make example versus personal forecast explicit. Show paid readings unavailable until an explicit legally/provider-approved activation; continue access to existing owned reports.
- Before/after: free-windows promise -> chart -> quiz/paywall; after: free-chart promise -> chart facts -> correct/explore/example -> unavailable paid explanation when relevant.
- Reuse/remove: reuse priceBook, free tool routes, sample-report, entitlement checks; combine duplicate offer descriptions and remove sale CTAs/structured InStock offers for unavailable products. Preserve legacy records and free-unlock guards.
- Dependencies/effort: primary copy/front-end/backend owners; official UAE/provider confirmation for later activation. 1-3 days, low confidence until all public/private entry surfaces inventoried.
- Risk/exclusions: avoid locking existing paid records; no checkout activation, new tiers, discount funnels, ads or licence workaround.
- Acceptance: homepage, tools, pricing, FAQ, assistant text and structured offers agree; default-off server gate rejects new intent and upgrade without provider calls; existing owned results remain accessible. Gate is locally implemented but verification pending.
- Measurement: observed comprehension of offer, mismatch counts by entry path, server availability tests and clear next-action success; no demand inferred from synthetic rows.

## P2 - Preserve Birth-Time Uncertainty End to End

- Problem/evidence: E03/E04/E05/B02 show noon initialization, unsupported precision reassurance and absent API precision state.
- Affected scenarios: facts/verdict/partner/deep tasks with uncertain or boundary flags; time-sensitive Lagna, nakshatra/pada, periods and matching.
- Root cause: a filled time string substitutes for knowledge of the time; UI state is not part of calculation provenance.
- Solution: exact/approximate/unknown choice, no silent noon; require exact time for unsupported outputs or use a clearly labelled approximation with bounded limitations. Store uncertainty with results and handoffs.
- Before/after: preset 12:00 -> apparently precise output; after: explicit precision -> supported fields or qualified approximation -> correct time and recalculate.
- Reuse/remove: reuse BirthDetailsInput, validators, source calculation and existing without-birth-time guide; remove blanket Moon/nakshatra/Gun Milan accuracy statement.
- Dependencies/effort: calculation/security/QA owners; independently checked sign/star/ascendant and timezone boundary fixtures. 2-5 days with medium implementation and high numerical-validation uncertainty.
- Risk/exclusions: do not invent a rectification engine, infer a factual time from personality questions or break exact historical records.
- Acceptance: missing/unknown/approximate states survive refresh, draft, API, stored record and result; no exact claim from an unknown time; explicit correction remains possible. Boundary and timezone tests compare reference methods, not just self-consistency.
- Measurement: observed field comprehension, wrong-time attempts, uncertainty explanation and correction success on isolated synthetic fixtures.

## P3 - Deliver the Promised Free Verdict Without Marketing Capture

- Problem/evidence: E03/E06/B01 confirm doshas are computed but hidden; email reveal writes newsletter_subscribers without the quiz's separate marketing control E23.
- Affected scenarios: all 24 verdict tasks, factor-specific and privacy-conscious contexts across A/C/X; uncertainty rules still apply.
- Root cause: acquisition soft gate is coupled to chart disclosure rather than an optional useful continuation.
- Solution: return/display supported free facts and qualified verdicts without collecting email. Offer optional save/service delivery separately; marketing remains explicit, optional and unchecked.
- Before/after: enter birth data -> blurred placeholder -> email -> verdict; after: enter appropriate data -> actual qualified result -> optional chosen save/share.
- Reuse/remove: reuse detectDoshas, result components, quiz consent primitives; remove DoshaLock and reveal-trigger newsletter insertion from the free result path. Preserve previously consented records.
- Dependencies/effort: backend/privacy/front-end owners, uncertainty availability from P2. 1-2 days, medium confidence after schema/path review.
- Risk/exclusions: no customer-data deletion, outbound email, fear-based verdict framing or browser-only cosmetic unlock.
- Acceptance: fictional anonymous API contains the appropriate supported flags with no address; no lead/newsletter write and no fake blurred Yes; limitations shown at result; one task runs through the UI on desktop/mobile.
- Measurement: successful anonymous result delivery and surprise-gate count; optional consent decisions must not be labelled conversion or willingness to pay.

## P4 - Make Correction and Return Use Dependable

- Problem/evidence: E03/E07/E21/E22 show transient calculator/form results and session-only handoff; E08/E12 show existing quiz/account reuse worth preserving.
- Affected scenarios: calculator/deep/partner tasks with refresh/newsession/crossdevice/storage flags; saved/account/renewal tasks; related B/C/X return readers.
- Root cause: input handoff, quiz persistence and owned chart retrieval are separate systems with different scope; copy implies broader saving than implemented.
- Solution: explicit device-local input draft with chosen retention, pre-submit preservation and restoration; label whether results themselves persist. Reuse account-owned retrieval for durable cross-device work, with optional account adoption after value.
- Before/after: calculate -> session draft for another page -> revisit blank form; after: chosen draft -> refresh/back restore -> editable result context -> save/retrieve owned work when applicable.
- Reuse/remove: reuse onboard draft, safeInternalPath, quiz persist and user/charts; combine duplicate persistence declarations, remove unconditional saved claim when storage fails.
- Dependencies/effort: privacy owner, schema compatibility, isolated multi-account fixtures. 2-4 days, medium uncertainty about historic records.
- Risk/exclusions: local birth details on shared devices; no automatic cloud sync, forced account, public report link or ownership relaxation.
- Acceptance: refresh/back works; blocked storage produces truthful state; uncertain-time metadata persists; calculator correction discards stale output; account owner can retrieve while a second isolated account cannot. Cross-device only claimed for verified owned storage.
- Measurement: observed re-entry fields, interruption recovery and retrieval success; separately count anonymous versus account persistence.

## P5 - Make Results Useful and Proportionate

- Problem/evidence: E03/E21/E22 show terse facts, locked depth and numerical relationship totals; E15/E24 already support method/interpretation separation and examples.
- Affected scenarios: facts/partner/deep/sample, especially novice vocabulary, anxious factor readers and advanced-depth comparison contexts.
- Root cause: source facts, meaning, precision and next action are not consistently ordered; deeper paid scope is introduced before the free result is understood.
- Solution: visible calculation/input/date context, concise label meaning, uncertainty, correction and a relevant next action. Relationship totals remain interpretive traditional factors, not proof of relationship outcomes.
- Before/after: term/number -> upgrade; after: fact -> plain meaning/limit -> correction or relevant exploration -> clearly labelled example/deeper availability.
- Reuse/remove: reuse MethodNote, glossary, chart display, sample and existing result components; combine redundant CTAs and remove outcome certainty/health/financial authority framing.
- Dependencies/effort: domain reviewer and content/UI owners; 1-3 days, medium uncertainty about generated outputs not yet executed.
- Risk/exclusions: long defensive disclaimers, new model/persona selectors, fabricated testimonials or guaranteed predictive claims.
- Acceptance: visitor can describe a fact, its limitation and next action; exact numeric fields trace to deterministic source; generated commentary does not invent calculation or consequential certainty; mobile/assistive reading order verified.
- Measurement: observed interpretation accuracy in participant's own words and correction behavior; no fabricated quotes or claimed authorship percentages.

## P6 - Add Task-Based Help and Recoverable Failures

- Problem/evidence: E20/B03 show /help 404; E18/E19 already implement auth/reset/progress but not a proved complete recovery flow.
- Affected scenarios: all 20 help tasks plus generation/auth/network/expired/duplicate constraints. This does not mean all existing FAQ/email support is absent.
- Root cause: general explanation and operational telemetry substitute for guidance tied to a specific blocked task.
- Solution: reachable task-based help for inputs, unknown time, correction, saving, return access, unavailable paid readings and failed processing; contextual short errors with retry/return preservation.
- Before/after: help 404 or technical waiting state -> restart/email; after: named task answer -> corrected action or safe retry -> existing work retained.
- Reuse/remove: reuse FAQ/MethodNote, humanizeAuthError, error components, saved-report status; remove unnecessary technical generation detail from primary customer feedback.
- Dependencies/effort: support/front-end/backend/QA owners; 1-3 days, high uncertainty on real provider timeouts.
- Risk/exclusions: no support staffing claims, service-level promises or expensive presenter video before current journey is stable.
- Acceptance: /help 200 and linked from errors; invalid city, missing date, timeout, duplicate click and expired session each have an actionable path; inputs survive; async errors announced accessibly; no duplicate charge/generation.
- Measurement: executed failure recovery, avoidable restart count and participant assistance required.

## P7 - Make Data Controls Discoverable and Honest

- Problem/evidence: E13/E14 owner-scoped APIs coexist with dashboard email deletion E29; E23 notice and E06 calculator capture differ; E17 masking does not prove meaningful analytics choice.
- Affected scenarios: privacy/account/share/verdict tasks, partnerprivacy and shared-device states.
- Root cause: policies, settings, marketing capture and retention operate as separate surfaces; deletion is multi-step and can partially remove records before error.
- Solution: expose verified export/correction/deletion controls, clear retention/recipient scope, deliberate sharing and tracking choices; report partial-operation state accurately. Use isolated fixtures for destructive verification.
- Before/after: policy -> email request or undisclosed retention; after: plain scope -> deliberate control -> confirmed success or honest actionable incomplete state.
- Reuse/remove: reuse requireAuth, owner queries and confirmation guards; combine misleading settings copy with actual API semantics. Remove automatic marketing linkage, not historical consented data.
- Dependencies/effort: security/database/legal-domain reviewer; 2-4 days, high schema/retention-policy uncertainty.
- Risk/exclusions: no live PII query, real deletion, widened exports or legal compliance assertion from code alone; no rollback claim for irreversible partial cleanup.
- Acceptance: isolated account A cannot export/delete B; export failures do not silently appear complete; partial deletion message does not assert untouched data; subscriber access preserved when not deleting; share payload reviewed; optional marketing independent.
- Measurement: control discoverability and isolated ownership/error tests; document retained financial records without claiming statutory adequacy.

## P8 - Instrument the Journey and Require Scoped Release Evidence

- Problem/evidence: E17 implements tracking but not verified denominators/consent/attribution. B04 basic navigation cannot stand in for 400 scenarios or full UX verification.
- Affected scenarios: all 400 for assessment governance; channel/device/intent/return slices are experimental coverage, not audience estimates.
- Root cause: activity and passing component/route checks are easy to confuse with measured useful outcomes and live release proof.
- Solution: minimal privacy-safe task events for start/result/correction/save/retrieve/error/help; define each denominator and selection bias. Record source, test, deployment and live verification independently; after stable repairs run a small real-user observation study.
- Before/after: generic visits/clicks -> synthetic optimistic score; after: scoped task evidence -> explicit unknowns -> verified release -> observed comprehension/effort/return findings.
- Reuse/remove: reuse calculator event trio, current browser script, audit generator and release ledger; remove unsupported claims of demand, automation %, rankings or 95+.
- Dependencies/effort: primary QA/release/security/research owners; 1-3 days for instrumentation/verification plus separately scheduled recruitment; high research timing uncertainty.
- Risk/exclusions: no PII analytics, customer-data queries, campaign activation, invented probability, team/model count or score inflation.
- Acceptance: weights/counts/CSV roundtrip/source anchors/reproducibility pass; browser scope logged exactly; account isolation and full task sequences distinct from route smoke; exact source/deployment recorded; post scores change only dimensions with versioned relevant evidence.
- Measurement: completion/correction/assistance/time/re-entry from consented observed tasks. Report real participant, reviewer, synthetic and browser counts separately; use uncertainty not manufactured 95+.
