# Plan v4 - GPT-5.5 Final Launch Plan

**Author:** GPT-5.5  
**Target:** Monday 2026-05-18 06:00 IST  
**Execution anchor:** Sunday 2026-05-17 12:00 IST, because the prompt says roughly 18 hours remain. If the real start is later than 12:00 IST, compress only by cutting P1 work, not by skipping gates.  
**Verdict:** Launch Monday 06:00 IST is possible, but only as a controlled English-first launch of the existing product. If any payment, report completion, citation truth, or production observability gate is red at Monday 02:00 IST, the fallback launch is Monday 18:00 IST.

## 1. Executive Position

v3 is the best prior plan, but it is still about 20-30 percent too large for the remaining window. I adopt v3's strongest corrections: no orchestrator refactor, no `next-intl` route work, no fake testimonials, redirect-based Ziina verification as the primary payment completion path, explicit content correctness, cost guardrails, support readiness, and privacy work for new telemetry.

I reject or narrow four parts of v3.

First, the report-start burst test is valid in spirit but wrong as written. The route rate-limits starts to 3 requests per 60 seconds per authenticated key at `src/app/api/reports/start/route.ts:35` and `src/app/api/reports/start/route.ts:236`. The bypass auth path maps every bypass request to the same user id unless `BYPASS_USER_ID` changes at `src/lib/api/requireAuth.ts:18` and `src/lib/api/requireAuth.ts:42`. Therefore v3's "20 concurrent bypass report starts, all 202" is not a valid pass condition. The v4 burst gate is: three same-user report starts must prove the per-user limiter behaves; queue capacity gets tested through health and one paid/bypass report, not by burning 20 paid pipelines.

Second, dashboard CTA work is not P0. The dashboard already has a `+ New Report` CTA in the non-empty overview at `src/app/(app)/dashboard/page.tsx:568`, a "Generate one" CTA in the empty recent reports state at `src/app/(app)/dashboard/page.tsx:636`, a first-report CTA at `src/app/(app)/dashboard/page.tsx:735`, and a paid-report CTA in the empty payments state at `src/app/(app)/dashboard/page.tsx:758`. Screenshots may still reveal mobile polish needs, but the feature is present.

Third, the "approximate birth time" flag is not launch-blocking. The onboarding copy already tells users exact time matters and approximate time lowers confidence at `src/app/onboard/_OnboardForm.tsx:225`, and the field hint tells unknown-time users to use 12:00 at `src/app/onboard/_OnboardForm.tsx:240`. Persisting a new `approx_birth_time` field would require threading a new state value through onboarding and report creation, while the start route currently upserts fixed report fields and does not preserve unknown body keys at `src/app/api/reports/start/route.ts:379`. Do not add a database column before launch.

Fourth, PostHog is not allowed to silently ship before consent and privacy are done. The current privacy page says usage data is collected via standard analytics at `src/app/privacy/page.tsx:26`, says optional analytics cookies exist at `src/app/privacy/page.tsx:32`, and lists current sharing with providers but not Sentry or PostHog at `src/app/privacy/page.tsx:28`. The package dependency block has no Sentry or PostHog packages today at `package.json:29`. Sentry can ship with PII scrubbing. PostHog can ship only if session recording is disabled, event properties are scrubbed, privacy copy is updated, and analytics consent is enforced for jurisdictions where required. Otherwise PostHog waits until Monday 18:00 IST.

The launch goal is not "finish the roadmap." It is: no user pays and receives an ungrounded, broken, unobservable, or unrecoverable Jyotish report.

## 2. Repo Evidence Baseline

The product already has a real payment and report pipeline. `/api/reports/start` is explicit about Inngest dispatch, production no-inline behavior, and the `REPORT_START_REQUIRE_INNGEST` kill switch at `src/app/api/reports/start/route.ts:4`, `src/app/api/reports/start/route.ts:7`, and `src/app/api/reports/start/route.ts:10`. It emits a `generation_trace_id` on successful Inngest dispatch at `src/app/api/reports/start/route.ts:529` and returns `INNGEST_DISPATCH_FAILED` with the trace id when queue dispatch fails at `src/app/api/reports/start/route.ts:559`. The Inngest workflow decomposes report generation into ephemeris, nativity grids, daily commentary, hourly batches, monthly batches, weekly synthesis, and finalization at `src/lib/inngest/functions.ts:100`, `src/lib/inngest/functions.ts:168`, `src/lib/inngest/functions.ts:180`, `src/lib/inngest/functions.ts:186`, `src/lib/inngest/functions.ts:205`, `src/lib/inngest/functions.ts:211`, and `src/lib/inngest/functions.ts:221`.

The Jyotish engine is domain-specific, not generic astrology. The Python service sets Lahiri ayanamsa at `ephemeris-service/main.py:25`, calculates Vimshottari dasha at `ephemeris-service/main.py:197`, exposes hora schedules at `ephemeris-service/main.py:470`, Choghadiya at `ephemeris-service/main.py:524`, Rahu Kaal at `ephemeris-service/main.py:579`, and daily grids at `ephemeris-service/main.py:1544`. The TypeScript hora base logic is explicitly locked to the Python logic at `src/lib/engine/horaBase.ts:1`, and parity tests cover all 12 lagnas and seven grahas at `src/__tests__/horaBase.test.ts:53`.

The payment system is Ziina-first. Plan amounts exist for AED, USD, and INR at `src/lib/ziina/server.ts:26`, and country-to-currency maps AE to AED, IN to INR, and everyone else to USD at `src/lib/ziina/server.ts:51`. Middleware forwards the Vercel country-derived currency header at `middleware.ts:13`, and `/api/geo` returns detected currency and prices for all Ziina plans at `src/app/api/geo/route.ts:11`. Ziina redirect verification is the primary path: `/api/ziina/verify` looks up the stored intent binding, verifies the intent, finalizes idempotently, and redirects at `src/app/api/ziina/verify/route.ts:9` and `src/app/api/ziina/verify/route.ts:90`. The webhook route explicitly says API-only Ziina uses GET `/api/ziina/verify` and should leave the webhook secret unset at `src/app/api/ziina/webhook/route.ts:35`. The shared finalizer returns early for already-completed intents at `src/lib/ziina/finalizeIntent.ts:223`, updates the report as paid for forecast plans, and dispatches report generation at `src/lib/ziina/finalizeIntent.ts:329` and `src/lib/ziina/finalizeIntent.ts:337`.

The highest unresolved domain risk is citation truth. The Nativity prompt asks for `[[SOURCE:CHAPTER:VERSE]]` citations at `src/lib/agents/NativityAgent.ts:25`, repeats that instruction in the RAG context block at `src/lib/agents/NativityAgent.ts:61`, and even shows a BPHS verse example in the desired JSON at `src/lib/agents/NativityAgent.ts:75`. The Forecast prompt does the same for gochara references at `src/lib/agents/ForecastAgent.ts:80`. But RAG context construction usually gives source, chapter, topic, and text, not verse metadata, at `src/lib/rag/scriptures.ts:436`, `src/lib/rag/vectorSearch.ts:185`, and `src/lib/rag/vectorSearch.ts:260`. The citation extractor only recognizes full `SOURCE:CHAPTER:VERSE` markers at `src/lib/reports/postProcess/extractCitations.ts:16`, and the footnote UI renders "Ch." and "v." unconditionally at `src/components/report/ScriptureFootnotes.tsx:47`. This is why source-only fallback is a launch blocker.

The current marketing page still has a proof problem. The hero hard-codes "12,000+ charts generated" and "4.8 from 340+ seekers" at `src/components/landing/Hero.tsx:5`. Unless those numbers can be tied to production analytics before launch, they must be removed. The same hero already has real product proof: Swiss Ephemeris, Lahiri ayanamsa, and Vimshottari dasha at `src/components/landing/Hero.tsx:34`, and the CTA already leads with free Kundli at `src/components/landing/Hero.tsx:67`.

## 3. Launch Definition

Monday 06:00 IST launch means all of these are true:

1. A logged-in user can generate a free Kundli preview without payment.
2. A logged-in user can create a Ziina payment intent, pay or complete the hosted checkout, return through `/api/ziina/verify`, and land on a generating or completed paid report.
3. A paid 7-day report completes without paid-report placeholder text. The orchestrator already bans paid placeholder fallback at `src/lib/reports/orchestrator.ts:339`, detects "commentary is generating" placeholder copy at `src/lib/reports/orchestrator.ts:365`, and asserts paid monthly and weekly content before final assembly at `src/lib/reports/orchestrator.ts:1823`.
4. A report visibly contains Lahiri-based lagna, Moon sign, current Vimshottari dasha, hora, Choghadiya, Rahu Kaal, and a PDF path. The PDF and Markdown buttons are present on the report page at `src/app/(app)/report/[id]/page.tsx:1285` and `src/app/(app)/report/[id]/page.tsx:1297`.
5. Citation display never invents verse numbers. If retrieved chunks lack verse metadata, report text cites source title or source plus chapter only.
6. Aarsh can identify a failure within minutes using `/api/health`, Sentry errors, Supabase `generation_trace_id`, report generation logs, and the report-page diagnostics UI. The report error UI already displays support trace ids and retry controls at `src/app/(app)/report/[id]/page.tsx:1081` and `src/app/(app)/report/[id]/page.tsx:1116`.
7. No public page claims fake usage, fake ratings, fake scarcity, or fake testimonials.
8. Paid failures have a support path and no double-charge path.

If any item is false at Monday 02:00 IST, do not launch at 06:00. Use the Monday 18:00 IST fallback.

## 4. Final P0 Scope

### P0.1 - Freeze the report pipeline

Do not refactor `src/lib/reports/orchestrator.ts` or `src/app/api/reports/start/route.ts`. They are large, but they are also the live path. The current worktree has `src/lib/reports/orchestrator.ts` ending at line 2129 and `src/app/api/reports/start/route.ts` ending at line 678, so any broad extraction is too risky for the window. Only touch these files if a launch gate fails and the patch is narrow, testable, and reversible.

### P0.2 - Production environment verification

Use `.env.example` as the source checklist. Confirm Supabase keys at `.env.example:1`, bypass/admin settings at `.env.example:6`, Ziina token and optional webhook semantics at `.env.example:12`, Inngest keys and strict dispatch at `.env.example:31`, `JOB_TOKEN_SECRET` at `.env.example:38`, Upstash Redis at `.env.example:43`, Anthropic at `.env.example:48`, fallback providers at `.env.example:51`, ephemeris service URL at `.env.example:68`, and `NEXT_PUBLIC_URL` at `.env.example:74`.

Run `node scripts/verify-report-generation-env.mjs` with strict production-like envs. That script already checks Anthropic, Supabase, Inngest, ephemeris, job secret, bypass, function duration, and fallback providers at `scripts/verify-report-generation-env.mjs:26`, `scripts/verify-report-generation-env.mjs:29`, `scripts/verify-report-generation-env.mjs:37`, `scripts/verify-report-generation-env.mjs:55`, `scripts/verify-report-generation-env.mjs:62`, `scripts/verify-report-generation-env.mjs:82`, `scripts/verify-report-generation-env.mjs:85`, and `scripts/verify-report-generation-env.mjs:94`. It does not fully validate Ziina or Upstash, so verify those manually in Vercel.

### P0.3 - Health endpoint and Sentry

Add `/api/health` with no secrets in output. It should return dependency status for Supabase, Ziina configured, Inngest configured, Upstash configured, ephemeris reachable, Anthropic configured, build version, and timestamp. It should return 503 only for report-blocking dependencies: Supabase, Ziina configuration for paid launch, Inngest when `REPORT_START_REQUIRE_INNGEST` is true, and ephemeris. Analytics degradation should be 200 with a degraded field.

Add Sentry minimal server/client/edge setup with aggressive PII scrubbing. The CSP currently permits Supabase, Anthropic, Google Maps, OpenCage, and Ziina in `connect-src` at `next.config.mjs:46`, so Sentry endpoints must be added before production verification. Sentry event context may include `user_id`, `report_id`, `plan_type`, `generation_trace_id`, route, phase, and sanitized error code. It must not include name, birth date, birth time, birth city, current city, report text, email, IP, or full request body.

PostHog is conditional P0. It ships only if privacy text, consent, and no-session-recording settings are complete before Sunday 15:00 IST. Otherwise the Monday launch uses Sentry plus DB observability, and PostHog moves to Monday 18:00.

### P0.4 - Citation truth patch

This is the most important v4 change. Do not merely audit citations after generation. Patch the system so the model cannot be instructed to invent missing verse numbers.

Implementation standard:

- Change Nativity and Forecast prompts from "cite `[[SOURCE:CHAPTER:VERSE]]`" to "cite only metadata actually present in retrieved context; use source title only when verse is unavailable."
- Change the extraction/rendering path to accept source-only or source-plus-chapter citations, not only full chapter-verse markers. The current regex requires all three parts at `src/lib/reports/postProcess/extractCitations.ts:16`, and the UI unconditionally prints chapter and verse at `src/components/report/ScriptureFootnotes.tsx:47`.
- Change the footnote footer that currently says verse numbering follows scholarly editions at `src/components/report/ScriptureFootnotes.tsx:59`; that sentence is unsafe unless the cited chunk actually includes verse metadata.
- Manual audit three generated reports: one free, one 7-day paid/bypass, and one monthly/bypass if available. Every footnote must tie to retrieved source metadata. If any citation contains an unverified verse number, block launch.

Acceptance: source title only is acceptable. Chapter-only is acceptable when the context provided a chapter. Verse numbers are acceptable only when the retrieved chunk includes stable verse metadata. The domain reminder is binding: if a retrieved chunk lacks verse metadata, do not invent verse numbers.

### P0.5 - Payment and idempotency proof

Run one complete Ziina create-intent to verify flow on staging or production test mode. The create-intent route is the server-side payment binding path at `src/app/api/ziina/create-intent/route.ts:16`; the verify route is the primary completion path at `src/app/api/ziina/verify/route.ts:9`. Re-run `/api/ziina/verify` with the same intent after completion and confirm the finalizer returns already done rather than double-dispatching, using the early return at `src/lib/ziina/finalizeIntent.ts:223`.

Also verify that a browser user cannot insert or update a report as paid. The RLS migration blocks client-side paid inserts and updates at `supabase/migrations/20260514_lock_down_paid_report_status.sql:4` and `supabase/migrations/20260514_lock_down_paid_report_status.sql:12`.

### P0.6 - Report smoke and domain checks

Run one free preview and one paid/bypass 7-day report. The Playwright bypass test already exercises report start and polls status with a six-minute cap at `e2e/report-generation-bypass.spec.ts:32`, and accepts completion only when report days exist at `e2e/report-generation-bypass.spec.ts:68`. Do not treat "status=error with non-empty error" as a launch pass; that is useful diagnostic behavior, but launch requires at least one successful paid/bypass report.

Manual domain checklist for the successful report:

- Lagna equals ascendant rashi and is sidereal/Lahiri.
- Moon sign and current dasha are visible.
- Dasha lord sequence and current Mahadasha/Antardasha dates are plausible.
- Hora schedule appears and the lords rotate in the Chaldean/day-lord order.
- Choghadiya and Rahu Kaal appear for the user's current city/date.
- Rahu Kaal copy avoids fatalism and does not say every action will fail.
- No medical, legal, guaranteed marriage, guaranteed job, or guaranteed wealth claim appears.
- No system prompt, hidden instruction, or unrelated person's PII appears.
- PDF path works.

### P0.7 - Existing test suite

Run:

```bash
npm run typecheck
npm run lint
npm run test
npm run build:reliable
npm run test:playwright
npm run test:e2e:bypass
npm run rag:compare
node scripts/verify-report-generation-env.mjs
node scripts/verify-reports-observability.mjs
```

The scripts are already defined for typecheck, lint, Vitest, reliable build, RAG compare, bypass E2E, and Playwright at `package.json:8`, `package.json:10`, `package.json:11`, `package.json:13`, `package.json:16`, `package.json:23`, and `package.json:25`. CI currently runs typecheck, lint, tests, two targeted Vitest files, and reliable build at `.github/workflows/ci.yml:19`. Do not add twelve new E2Es now. Fix reds only.

### P0.8 - Honest marketing, support, and Hindi signal

Remove hard-coded social proof numbers unless proven. The hero's "12,000+" and "4.8 from 340+ seekers" are in code at `src/components/landing/Hero.tsx:5`. Replace them with product proof: free Kundli, Lahiri ayanamsa, Vimshottari dasha, hora/Choghadiya/Rahu Kaal, source-grounded commentary, refund policy, and support email.

Add visible support email to the shared footer. The current footer links pricing, refund, privacy, and terms but no email at `src/components/shared/Footer.tsx:12`. The legal pages and JSON-LD already know `support@vedichour.com`, but launch support should be visible without digging through structured data.

Keep English-only reports. The root layout is explicitly `lang="en"` at `src/app/layout.tsx:123`, and there is no `next-intl` dependency in `package.json:29`. A Hindi waitlist component is acceptable only if it is a small static CTA and does not create locale routes, payment redirects, or translated report promises. `messages/en.json` can be prepared after launch, but it is not P0 and should not be imported by Monday code.

### P0.9 - Cost, compliance, and support runbook

Adopt v3's cost guardrails as operational actions, not a code expansion:

- Anthropic spend alert at 80 percent of launch-day cap.
- Inngest concurrency checked and capped to a value the current account can afford.
- Sentry spike protection on.
- Vercel bandwidth alert on.
- Upstash Redis present in production, because without it the rate limiter falls back to in-memory behavior at `src/lib/api/rateLimit.ts:34` and the Redis client returns null when Upstash envs are absent at `src/lib/redis/client.ts:8`.

Support coverage for Monday 06:00-23:59 IST:

- First response within 2 hours for paid users.
- First response within 8 hours for free users.
- Paid user stuck more than 30 minutes gets a manual update and either retry or refund path.
- Refunds remain manual through Ziina dashboard; no admin refund route before launch.
- Keep four tabs open: Sentry, Vercel logs, Supabase reports/report_runs, and Ziina dashboard.
- Standard macros: paid but no report, failed report retry, wrong birth data, refund request, Hindi availability.

Privacy requirements:

- Update privacy policy before enabling PostHog or Sentry in production.
- List Sentry and PostHog if used.
- Disable PostHog session recording.
- Do not capture raw birth data, names, cities, emails, report text, IPs, or full prompts in telemetry.
- Use analytics consent gating for India, UK, and EEA until counsel says a narrower approach is safe.

## 5. Deliberate Non-Goals Before Monday 06:00

Do not do these:

- Split `orchestrator.ts`.
- Split `/api/reports/start`.
- Add `next-intl` routing.
- Add a manual currency switcher.
- Add a new dashboard tab architecture.
- Add an admin refund route.
- Add broad Python pytest coverage.
- Expand or re-embed the corpus.
- Add fake testimonials, fake ratings, fake counters, fake scarcity, or unsupported "charts decoded" numbers.
- Add a new database migration unless a launch gate is otherwise impossible.
- Run heavy load tests against report generation.

## 6. Performance Budget

Use v3's performance budget as a smoke discipline, not as an excuse to rewrite UI. Hard budgets for launch:

- `/api/health` p95 <= 300 ms on staging, matching the existing operations runbook report-start standard at `docs/architecture/OPERATIONS_RUNBOOK.md:24`.
- `/api/reports/start` returns 202 from Inngest within 800 ms for the successful bypass smoke. The route is designed to return immediately after Inngest send at `src/app/api/reports/start/route.ts:548`.
- 7-day report completion p95 target remains under 180 seconds and success rate above 95 percent, matching `docs/architecture/OPERATIONS_RUNBOOK.md:25` and `docs/architecture/OPERATIONS_RUNBOOK.md:27`.
- Landing Lighthouse mobile should be at least 85, with no serious console errors. If it is 85-89 and all core flows pass, launch is allowed. If it is below 85 because of a single obvious asset or script, fix that. Do not redesign the hero.
- CLS <= 0.10 on landing and onboarding.

Rejected v3 budget: mobile fast-3G LCP <= 2.0s as a hard launch blocker. It is good ambition but too brittle for an 18-hour launch, especially with an existing full-viewport animated hero at `src/components/landing/Hero.tsx:20`. Use it as diagnostic, not no-go.

## 7. Final Timeline

This is the executable 18-hour timeline. If real T+0 is later than Sunday 12:00 IST, cut only optional PostHog and Hindi waitlist work first.

| Time IST | Owner | Work | Gate |
|---|---|---|---|
| Sun 12:00-12:45 | Release captain | Freeze scope, assign lanes, confirm Vercel env checklist, confirm no source edits outside P0. | P0 board locked |
| Sun 12:45-14:15 | Platform | Add `/api/health`, add Sentry with PII scrubbers, CSP update, run env verifier. | Health JSON works on staging; Sentry test event visible |
| Sun 14:15-15:30 | Domain | Patch citation prompt/extractor/display for source-only citations. | No verse citation unless metadata exists |
| Sun 15:30-16:30 | Marketing/UI | Remove fake hero stats, add footer support email, add small Hindi waitlist only if static. | Landing proof is honest |
| Sun 16:30-18:00 | Payments | Ziina create-intent and verify smoke, duplicate verify, RLS paid-status check. | No double finalization |
| Sun 18:00-19:30 | Reports | Free and paid/bypass report generation, PDF check, failed-state diagnostics check. | One paid/bypass report complete |
| Sun 19:30-21:00 | QA | Typecheck, lint, Vitest, RAG compare, reliable build. | All required commands green |
| Sun 21:00-22:00 | Browser QA | Playwright smoke, mobile screenshots, Lighthouse, console check. | No blocking UI/mobile issue |
| Sun 22:00-23:00 | Operations | Cost caps, support macros, privacy text, telemetry consent decision. | Runbook ready |
| Sun 23:00-Mon 00:30 | Content gate | Aarsh reads one paid report end to end. Domain reviewer checks two more reports spotwise. | Content approval |
| Mon 00:30-02:00 | Release captain | Go/no-go review. If any P0 gate red, shift launch to Mon 18:00 IST. | Final launch decision |
| Mon 02:00-04:00 | Platform | Deploy production, run `/api/health`, public smoke, one production bypass report if allowed. | Production smoke green |
| Mon 04:00-06:00 | All | Watch Sentry/Vercel/Supabase/Ziina, keep support inbox open. | Launch at 06:00 |

## 8. Go / No-Go

Go only if:

- Env verifier green or warnings explicitly accepted.
- `/api/health` production returns healthy for report-blocking dependencies.
- Sentry captures a test error and no PII is visible.
- Payment create-intent and verify both work.
- Duplicate verify is idempotent.
- One paid/bypass report completes with no placeholder copy.
- Citation audit has zero invented verse numbers.
- Landing has no fake proof.
- Footer has visible support email.
- Typecheck, lint, tests, build, Playwright smoke, bypass E2E, RAG compare are green or have a written non-blocking waiver.
- Aarsh approves one paid report content by Monday 02:00 IST.

No-go if:

- Ziina production token or redirect is uncertain.
- Inngest is unavailable while strict dispatch is required.
- Paid report generation cannot complete once.
- Any paid output includes invented citations, placeholder copy, system prompt text, or another person's PII.
- Report failures are not visible with trace ids.
- Production health is missing or misleading.

Fallback: Monday 18:00 IST with the same gates. Do not lower the gates to preserve the 06:00 date.

## 9. Rubric Self-Score

| Dimension | Score | Justification |
|---|---:|---|
| 1. Feasibility in remaining window | 9 | The plan cuts already-existing dashboard work, route refactors, broad i18n, broad load tests, and optional PostHog if consent is not ready. |
| 2. Technical depth | 9 | It uses route, payment, RAG, citation, CSP, rate limit, and observability details with file-line evidence. |
| 3. Sequencing | 9 | Visibility and citation correctness happen before smoke; content approval happens before deploy; go/no-go is at 02:00 IST. |
| 4. Testing rigour | 8 | Uses existing tests plus payment idempotency, content audit, health, Sentry, and one successful paid/bypass report; avoids fake heavy load. |
| 5. Domain fidelity | 9 | Treats Lahiri, lagna, Vimshottari, hora, Choghadiya, Rahu Kaal, and citation metadata as launch gates. |
| 6. UX / design ambition vs realism | 8 | Removes dishonest proof and adds support visibility, but avoids dashboard/onboarding rebuilds. |
| 7. i18n / market fit | 8 | English-first, INR/AED/USD already supported, Hindi waitlist allowed only as static capture. |
| 8. Observability | 8 | Health plus Sentry plus existing DB logs is enough; PostHog is conditional to avoid privacy risk. |
| 9. Risk management | 9 | Clear no-go, fallback time, cost caps, privacy guardrails, support SLAs, and citation gate. |
| 10. Autonomy | 8 | Only two required human approvals: content gate and final go/no-go. Everything else is objective. |
| **Total** | **85/100** | Lower than v3's self-score because this plan treats the 18-hour window, privacy work, and burst testing more strictly. |

## 10. Final Instruction

Execute this plan, not v3, for Monday 06:00. v3's direction is mostly right, but v4 is the version with the correct launch-time tradeoffs: patch citations, prove payment/report flow, add health and Sentry, remove fake proof, make support visible, and stop.
