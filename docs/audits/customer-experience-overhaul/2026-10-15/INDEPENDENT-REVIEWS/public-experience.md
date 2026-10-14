# Public Experience Independent Review

Date: 2026-10-15. Checkout: C:\Users\user\Projects\jyotish-ai.
One independent reviewer executing four perspectives: product architect, UI/UX designer, frontend engineer, technical writer. No other reviewer grades or findings were read. BRIEF.md, IMPLEMENTATION-PLAN.md and relevant source were read before recording this baseline and before implementation edits.

## Baseline Evidence (Before Edits)

- Product architect: the homepage renders thirteen promotional sections (src/app/(marketing)/page.tsx:104-116), including two pricing surfaces, product cards, use cases, comparisons and a waitlist before its closing action. The primary path is not a concise chart-first journey.
- Product architect: src/components/tools/ChartTool.tsx defines and displays Lagna, Sun/Moon signs, nakshatra, dasha and dosha results. It does not return personalized hourly windows. Hero.tsx:62 promises "See today's windows - free" and FreeKundli.tsx:19-20,49-50 promises an hourly sample from the free calculator. These promises do not match that result contract.
- UI/UX designer: Hero.tsx:21 occupies a full viewport before the next section, with StarField and an animated aura but no actual product visual. The H1 does not foreground the literal VedicHour brand. globals.css:266,274 gives cards 16px radii; tailwind.config.ts:114-116 uses viewport-scaled display text and negative tracking. The palette is primarily plum-indigo and amber.
- Frontend engineer: Navbar.tsx renders duplicate forecast/report acquisition actions through AuthButton and the main CTA. The mobile menu closes on Escape but does not restore toggle focus, and mobile authentication adds another report CTA. Pricing page schema advertises paid plans InStock unconditionally (src/app/pricing/page.tsx:218,225); pricing/layout.tsx:34-37 always publishes paid price metadata.
- Technical writer: faq-data.ts:33-34 makes unsubstantiated competitor/professional-standard claims; :26 asserts generated commentary cannot invent positions; :50 makes blanket storage-encryption/payment compliance claims without source evidence in this review. Pricing offers included paid features, refund promises and purchase paths without commercial readiness.
- Existing product evidence: sampleForecast.ts and sampleData.ts contain engine-calculated output for an explicitly invented sample birth (15 Jun 1992, 09:00, New Delhi). Reuse it with an explicit sample label, not as a real customer or proof of predictive accuracy. Existing report/sample adapters have regression tests and must retain their exports and data.

## Implementation Scope And Criteria

Own only the assigned home, landing components, shared Navbar/Footer/LaunchBanner, pricing page/layout, landingCopy, faq-data, globals.css and tailwind.config.ts. This review file is the explicitly requested audit exception. No worktree, commit, push, deployment, mail, billing or paid generation.

- Shorten home to a clear free-chart action, a real calculated sample, factual explanation, concise FAQ and an actionable close.
- Use the primary engineer's server commercialAvailability() on pricing. Do not edit or enable the gate. Show paid prices/features/purchase links and offers only when checkoutEnabled is true.
- Keep calculation distinct from interpretation; remove superiority, free-hour and unverifiable security claims. Treat birth-time uncertainty honestly.
- Preserve existing dark/light token names and report selectors. Introduce neutral charcoal/off-white, pale teal and restrained gold; use 8px cards, fixed/rem typography and zero tracking.
- Keyboard/mobile navigation must have visible focus, accurate expanded state, Escape handling and a reachable free-chart action. Prefer semantic elements and existing lucide icons.

Working assumptions: mobile/4G first with desktop support; public SEO-dependent Next 14 server rendering; WCAG AA target with this reviewer owning changed public surfaces. Performance targets, not measured results: mobile p75 LCP <= 2000ms, INP <= 200ms, CLS <= 0.1; route JS <= 150KB gzip; Lighthouse accessibility >= 95 and performance >= 90. Local source/type tests and browser checks will be recorded separately; no live-performance score is claimed.

## Integration Notes For Primary Summary

- Root src/app/layout.tsx is outside ownership and still has hourly-first description, dark theme metadata and unconditional global SoftwareApplication offers. The primary engineer must reconcile those with the commercial gate and chart-first copy.
- Account/help and calculator/form/API edits belong to other owners. Shared navigation will route to /help, /dashboard and /account without changing those implementations.
- Existing landingCopy.test.ts assumes an unconditional subscription sales line in the free FAQ; that assertion needs updating to the new truthful availability contract by the test owner if it fails. Price-book compatibility exports will be preserved.

## Verification

Implementation completed within the assigned source ownership. The home now has six sections instead of thirteen, uses a literal VedicHour H1, a direct free-calculator action and the existing calculated sample chart. The diagram reuses existing South Indian fixed-sign geometry, not a decorative illustration. Sample data and report adapters were not changed.

Pricing is request-rendered with commercialAvailability(). No disabled paid cards, paid feature bundles, purchase actions, price metadata or Product offers are rendered. Retained landing Pricing, PricingComparison and Products templates are also server-gated. The commercial module, environment and payment APIs were not edited or enabled.

Navigation uses familiar lucide icons, a free chart action and account/report destinations rather than duplicate paid CTAs. Mobile disclosure works by keyboard, restores toggle focus on Escape and closes when resizing to desktop or navigating. FAQs use native details/summary, with identical copy in structured data. Footer no longer inserts newsletter capture ahead of task links. Shared dark/light token names remain; public layouts use scoped classes. Cards are 8px maximum, text uses rem sizes and tracking is zero. No report-specific selectors were rewritten.

### Actual Tests

- PASS: npm run typecheck -- --incremental false. Final complete source check exited 0. Two transient AccountDashboard missing-symbol errors seen earlier were resolved by its owner without this reviewer editing that file.
- PASS: an additional scoped TypeScript program using the repository tsconfig checked 32 public/landing/config roots and their transitive imports with zero diagnostics.
- PASS: npm run test. Vitest reported 98 files passed, 1 skipped; 1,038 tests passed, 5 skipped. The skipped calculator browser cases are not counted as passes. Unit-provider paths use existing test stubs, not live purchases, mail or paid commentary.
- PASS: npm run test -- src/__tests__/landingCopy.test.ts src/__tests__/sampleReport.test.ts, 26/26. Main updated the old unconditional-subscription FAQ assertion; this reviewer did not edit the test.
- PASS: in-memory TypeScript-to-React server renders tested pricing with injected false and true availability fixtures. Disabled markup had free facts and /free-kundli, but no /start action, paid plans or Product InStock offers; enabled markup retained price-book-derived plans. This did not set COMMERCIAL_CHECKOUT_ENABLED or call checkout.
- PASS: additional server-render checks for the VedicHour H1/free-chart action, sample chart's twelve signs and actual Cancer/Scorpio/Jyeshtha fixture values, explicit invented-sample provenance, seven native FAQ disclosures and free-versus-paid wording.
- PASS: Playwright with installed Chrome against the existing local server http://127.0.0.1:3100, home and pricing at 320x720, 375x812, 768x1024, 1280x800 and 1920x1080. Ten route/viewport checks: visible first-viewport chart action, next-section hint, no horizontal overflow, twelve rendered chart cells, native FAQ Enter toggling, mobile Escape/focus restoration, unavailable commercial state and no paid cards/purchase links/Product schema. No page errors. Product diagram begins at y=695/643/612/612/612 respectively.
- PASS: mobile-to-desktop resize closes navigation; the sample anchor clears the sticky header; the primary CTA reaches /free-kundli and its actual form; reduced-motion rendering.
- PASS: git diff --check on assigned source paths, no whitespace errors.
- Source contrast calculation: public body on off-white 5.93:1, body on pale teal 5.37:1, link on pale teal 6.41:1, primary button 14.74:1. Gold icons on white 4.24:1. No measured WCAG/Lighthouse score or real-device p75 performance claim.

Screenshots were generated and visually inspected at C:\Users\user\AppData\Local\Temp\vedic-public-experience-awT2i1 (home-320.png through home-1920.png and corresponding pricing files). This is local verification of the shared server at check time, not a production/live verification or a fresh release build. Primary owns the final rebuild and integrated regression run as other workers finish.

The first browser schema check was overbroad: it rejected any InStock entry, including the legitimate free tier. Inspection confirmed zero paid root SoftwareApplication offers in all five pricing checks; the primary engineer's root-offer gate is working. Do not carry forward the initial false-positive paid-schema concern.

### Changed Files

All paths below are relative to C:\Users\user\Projects\jyotish-ai. Twenty source files plus this explicitly authorized audit file:

- src/app/(marketing)/page.tsx
- src/app/pricing/page.tsx
- src/app/pricing/layout.tsx
- src/components/landing/Hero.tsx
- src/components/landing/SampleReportPreview.tsx
- src/components/landing/SampleBirthChart.tsx (new)
- src/components/landing/FreeKundli.tsx
- src/components/landing/HowItWorks.tsx
- src/components/landing/FAQ.tsx
- src/components/landing/FinalCTA.tsx
- src/components/landing/Products.tsx
- src/components/landing/Pricing.tsx
- src/components/landing/PricingComparison.tsx
- src/components/shared/Navbar.tsx
- src/components/shared/Footer.tsx
- src/components/shared/LaunchBanner.tsx
- src/lib/landingCopy.ts
- src/lib/faq-data.ts
- src/app/globals.css
- tailwind.config.ts
- docs/audits/customer-experience-overhaul/2026-10-15/INDEPENDENT-REVIEWS/public-experience.md

No worktree, commit, push, deployment, service purchase, real payment, outbound mail or live paid AI generation. No other review grades were read. No synthetic aggregate grade or independent reviewer count beyond this one execution is claimed.

## Bounded Consent And Privacy Repair: Baseline

Recorded before this follow-up's edits. Ownership is now only the five named analytics components, new analytics preferences/gating/consent hooks, new analyticsConsent.test.ts, privacy/page.tsx and this review append. Root layout, backend account/data paths and the existing canonical analytics/client.ts are owned by primary/other workers.

- PostHogProvider initializes by default, writes vh_sid/vh_session_started, sends full search-bearing URLs to external pageviews, identifies signed-in accounts and enables click/autocapture/pageleave. Its first-party track() sends arbitrary properties and document.referrer without a consent check.
- GoogleAnalytics and MetaPixel initialize whenever their public identifiers are configured. Meta includes an unconditional no-JavaScript tracking image. FirstTouch and RefCapture write one-year/90-day attribution cookies without an explicit choice.
- privacy/page.tsx claims no advertising/third-party tracking cookies while the above integrations exist; it also asserts provider DPAs, no model training, encrypted storage, specific 24-month/7-year/12-month/36-month retention, and statutory response/transfer guarantees not verified here. Its provider order omits xAI and DeepSeek and incorrectly places Anthropic before OpenAI.
- Code evidence: tools/storage.ts uses optional vh_calculator_v1 with a seven-day TTL checked on read; ChartTool only saves after the remember checkbox is chosen. geocode/route.ts sends city search text to OpenStreetMap Nominatim and caches city candidates for seven days. modelChain.ts exports OpenAI -> Anthropic -> xAI/Grok -> DeepSeek, with optional configured pinned Anthropic calls. rag/vectorSearch.ts uses Google embeddings. Free chart calculations do not require email or a language model.
- Existing account export/delete actions and chart-privacy device controls must remain reachable, without promising all external copies/backups are erased. Quiz chart-link delivery and marketing opt-in are separate from usage analytics.

Root API sent early: existing analytics root placements can remain; each is self-gated. Named AnalyticsPreferences export will be rendered on /privacy, anchor /privacy#analytics-preferences. Primary should check hasAnalyticsConsent() from @/lib/analytics/consent before any optional storage/network in analytics/client.ts, including helpers and forced-event branches.

Conservative integration decision: GA and Meta stay disabled in this release, including when usage analytics is selected, because their automatic URL/enhanced-measurement behavior and deployed stream settings have not been audited for the no-private-URL requirement. Legacy loaded instances will be disabled/revoked. Explicit usage consent can enable sanitized PostHog and first-party events. No advertising choice implying safe activation is offered.

Operational uncertainty to resolve outside this source scope: actual account/report/log/backup/provider retention periods, existing deletion completeness, provider processing/training terms, contractual safeguards, and production account/privacy workflows were not verified. No legal conclusion, promised deletion deadline, statutory seven-year requirement or verified encrypted-at-rest guarantee is inferred.

## Bounded Consent And Privacy Repair: Final Implementation

The owner subsequently extended scope to analytics/client.ts and DropoffPrompt.tsx. Both optional client endpoints (/api/track and /api/events) are now default-deny. No root-layout changes were made by this reviewer. Existing root analytics mounts are compatible with the new self-gated implementations; the privacy page exposes the preferences directly.

### Behavior And Teardown

- New versioned local preference vh_optional_analytics_v1 grants usage analytics only after an explicit saved choice. Checking the checkbox alone does not enable it. Missing/malformed preferences, blocked storage without an explicit tab choice, Do Not Track and Global Privacy Control deny capture. No initial floating banner or mandatory step.
- track(), trackEvent(), attribution/session helpers and source/referral cookie writes check consent before optional requests/writes. The old force option remains only for caller compatibility and cannot bypass consent. Event properties are narrow fixed categories/counts, not birth details, text or quiz answers.
- First-party requests use coarse paths rather than private record IDs, omit raw URL queries/fragments, campaigns and referrers, and use referrerPolicy=no-referrer. /api/track no longer collects delegated click text. The browser analytics repair does not mutate server-side operational events, authentication, paid ownership or requested-task processing.
- PostHog only loads for explicitly consented, query-free/fragment-free fixed public routes. It does not load on calculators, accounts, report/quiz identifiers or other dynamic paths. Account identification, replay, form/click autocapture, pageleave, web vitals, errors, surveys, remote feature configuration and external extension loading are disabled. Persistence is memory-only.
- PostHog before_send replaces enriched properties with a small canonical page payload instead of relying on an incomplete blacklist. No raw URLs, initial referrers, DOM text or birth fields survive. Fixed generated identifiers/public project tokens are not account email/identity.
- Withdrawal runs SDK opt-out callbacks synchronously, aborts outstanding first-party requests and the current PostHog fetch generation, disables beacon/batching and attempts targeted optional-key cleanup. Aborted SDK request generations remain aborted after a later explicit choice. Consent revision guards prevent stale import/initialization promises from opting back in after withdrawal, even if another opt-in follows. Cross-tab changes are observed.
- Known optional identifiers/cookies include vh_sid, vh_attr_v1, vh_session_started, the retired drop-off key, first-touch/referral, PostHog and GA/Meta identifiers. Authentication tokens/cookies, calculator drafts, onboarding drafts and unrelated data are not cleared. A default-denied root also attempts to remove legacy optional identifiers without creating a tracking preference. Removal can be blocked, so UI says where the browser permits and does not guarantee a successful purge.
- GA and Meta always return null this release, including after usage opt-in; there is no Meta noscript pixel. Existing loaded GA/Meta instances receive disable/revoke commands. The settings and privacy copy explicitly explain that usage choice does not activate advertising pixels.
- Automatic offer/payment drop-off solicitation is disabled for this release: canShowDropoff() is false and DropoffPrompt() returns null. There is no analytics-based thank-you acknowledgement pretending feedback was received. Deliberate feedback remains in the existing dedicated feedback flow; this reviewer did not change its backend or force usage tracking for it.

### Privacy Copy And Remaining Limits

The page distinguishes free calculation (no email/model reading required), optional seven-day calculator drafts checked on read, city search via OpenStreetMap Nominatim, account storage, quiz delivery/marketing choices, requested LLM processing, optional usage measurement and existing account/device controls. It names the real OpenAI -> Anthropic -> xAI/Grok -> DeepSeek commentary chain and the possible pinned Anthropic stage, plus Google retrieval embeddings. Existing account export/deletion and device-control links remain, and withdrawal/access/correction/deletion/portability requests remain discoverable.

No DPA, provider-training promise, encrypted-at-rest guarantee, statutory seven-year retention, fixed automated server retention or arbitrary response/deletion deadline is asserted. Account/report/payment/support/log/provider/backup retention and deletion completeness still require operational verification by their owners. This client control cannot erase previously submitted events, provider-domain cookies or previously requested-task data. Third-party contractual/production configuration attestation is not inferred from source tests.

### Actual Verification

- PASS: complete source typecheck, npm run typecheck -- --incremental false, exit 0.
- PASS: focused analyticsConsent.test.ts with browser opt-in flag, 29/29. Reproducible PowerShell: $env:ANALYTICS_CONSENT_BROWSER_TEST = '1'; npm run test -- src/__tests__/analyticsConsent.test.ts. The flag enables only synthetic test execution, not COMMERCIAL_CHECKOUT_ENABLED or a paid provider.
- PASS: same focused run plus leadsCapture.test.ts, 58/58. The existing leads privacy-copy assertion is preserved with truthful optional marketing/Resend/unsubscribe wording; its test was not edited.
- PASS: latest full suite npm run test -- --reporter=dot --silent, 105 files passed and 1 skipped; 1,148 tests passed and 8 skipped at this check. Seven calculator browser cases and the opt-in consent browser case are skipped in that plain full-suite invocation; consent browser coverage was run separately above. Counts increased during parallel work; these are the final locally observed counts, not a frozen release score.
- Unit regressions exercise 100 calls on both optional endpoints with no default fetch or storage/cookie writes, explicit choice, ignored force bypass, payload/referrer/private-path stripping, bounded cookies, malformed preferences, opt-out without auth/draft deletion, storage denial/removal failures, DNT/GPC, cross-tab withdrawal, aborted requests, GA/Meta legacy opt-out, disabled drop-off feedback, SDK configuration and stale import/init promises.
- Browser regressions use the actual preference/provider/privacy source in an isolated React/Chrome harness with analytics endpoints and SDK mocked, at 375x900 and 1280x900. In each browser, 100 calls to both event helpers before consent produce zero analytics network requests and zero created tracking storage/cookies. Checkbox change alone sends nothing; saved consent permits a basic product event; withdrawal stops another 100 calls, opts out the SDK and clears SID/optional cookies while retaining seeded auth and calculator data. Malicious query/body/referrer values are absent. No horizontal overflow or page errors.
- Browser fixture requests never reach real analytics services. The harness server and browser close at completion. Corrected-scroll screenshots C:\Users\user\AppData\Local\Temp\vedic-consent-browser-Nrux6P\privacy-375.png and privacy-1280.png were visually inspected. The final rerun including default-denied legacy-key cleanup also passed 29/29 and generated equivalent screenshots at C:\Users\user\AppData\Local\Temp\vedic-consent-browser-MuqvN6. These are component/source browser regressions, not a new production deployment, a real SDK/provider attestation or primary's full Next release integration proof.
- PASS: git diff --check on this follow-up's scoped source paths. No secret values printed, paid calls, mail, purchases, ads, commits, pushes or deployments.

### Follow-Up Changed Files

Twelve source/test files plus this review append, all in the subsequently authorized scope:

- src/components/analytics/PostHogProvider.tsx
- src/components/analytics/GoogleAnalytics.tsx
- src/components/analytics/MetaPixel.tsx
- src/components/analytics/FirstTouch.tsx
- src/components/analytics/RefCapture.tsx
- src/components/analytics/DropoffPrompt.tsx
- src/components/analytics/AnalyticsPreferences.tsx (new)
- src/lib/analytics/client.ts
- src/lib/analytics/consent.ts (new)
- src/lib/analytics/useAnalyticsConsent.ts (new)
- src/__tests__/analyticsConsent.test.ts (new)
- src/app/privacy/page.tsx
- docs/audits/customer-experience-overhaul/2026-10-15/INDEPENDENT-REVIEWS/public-experience.md (append)

Exact integration API: hasAnalyticsConsent(): boolean is the synchronous gate; setAnalyticsConsent(enabled: boolean) returns enabled/persistent; useAnalyticsConsent() supplies allowed/revision/blocked state; registerAnalyticsCleanup() registers immediate withdrawal teardown. Named AnalyticsPreferences export is already rendered by privacy/page.tsx. Root does not need a new mount or wrapper; /privacy#analytics-preferences is the settings link. Final release build/live integration and independent re-review remain primary's responsibility.
