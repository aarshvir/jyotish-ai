# Plan v2 - GPT-5.5 Independent Launch Playbook

**Prepared for:** Aarsh, VedicHour  
**Launch target:** Monday 2026-05-18  
**Planning date:** Saturday 2026-05-16  
**Window:** About 48 hours  
**Principle:** Ship the existing product with confidence. Do not turn the launch window into a platform rewrite.

## Evidence Baseline

The repository is already a real SaaS, not a prototype. The launch plan should respect that.

- The app has a Next.js App Router surface with public marketing, protected dashboard, onboarding, report pages, pricing, refund, privacy, terms, and synastry routes. The public landing page already composes `Hero`, `HowItWorks`, `FreeKundli`, `HourlyPreview`, `Pricing`, `FAQ`, and `FinalCTA` at `src/app/(marketing)/page.tsx:84`.
- Ziina is the active payment system. Plan amounts are defined in base units for AED, USD, and INR at `src/lib/ziina/server.ts:26`, `src/lib/ziina/server.ts:49`, and `src/lib/ziina/server.ts:60`. Currency is auto-selected from Vercel country headers in `middleware.ts:13` and `src/lib/pricing.ts:40`.
- Report generation is already durable when Inngest is configured. `/api/reports/start` explicitly chooses Inngest, blocks production inline fallback unless allowed, rate-limits starts, locks by report id, and emits trace ids at `src/app/api/reports/start/route.ts:61`, `src/app/api/reports/start/route.ts:236`, `src/app/api/reports/start/route.ts:341`, and `src/app/api/reports/start/route.ts:529`.
- The background DAG exists. Inngest functions split the report into ephemeris, nativity, daily commentary, six hourly batches, monthly batches, weekly synthesis, and finalize steps at `src/lib/inngest/functions.ts:100`, `src/lib/inngest/functions.ts:170`, `src/lib/inngest/functions.ts:182`, `src/lib/inngest/functions.ts:187`, and `src/lib/inngest/functions.ts:225`.
- The Jyotish engine is not generic Western astrology. The Python service sets Lahiri ayanamsa at `ephemeris-service/main.py:29`, computes Vimshottari at `ephemeris-service/main.py:197`, computes 24 horas at `ephemeris-service/main.py:470`, computes Choghadiya at `ephemeris-service/main.py:524`, computes Rahu Kaal at `ephemeris-service/main.py:579`, and generates daily grids at `ephemeris-service/main.py:1544`.
- RAG is already wired. pgvector was migrated to 768 dimensions in `supabase/migrations/20260425_jyotish_scriptures_768dim.sql:1`, the app defaults to Google `text-embedding-004` and 768 dims at `src/lib/rag/vectorSearch.ts:22`, and strict source checks exist at `src/lib/rag/sourceValidation.ts:34`.
- The scripture corpus exists and is not tiny. The RAG unit test requires more than 1000 corpus entries and more than 1000 BPHS/Parashara entries at `src/__tests__/ragGrounding.test.ts:9`.
- Tests and CI exist. `package.json:11` runs Vitest, `package.json:23` runs the bypass Playwright report test, Playwright has mobile/tablet/desktop projects at `playwright.config.ts:22`, and CI runs typecheck, lint, tests, targeted Vitest scripts, and reliable build at `.github/workflows/ci.yml:14`.
- Observability is partly present in the database layer. `report_runs`, `agent_runs`, `generation_log`, and `generation_trace_id` exist through migrations and helpers at `supabase/migrations/20260425_report_run_observability.sql:4`, `supabase/migrations/20260426_report_generation_log.sql:5`, `src/lib/observability/reportRuns.ts:31`, and `src/lib/observability/generationLog.ts:29`. What is missing is external error/product telemetry: Sentry, PostHog, uptime alerting, and a public health endpoint.
- i18n is not present. Root layout is hard-coded to English at `src/app/layout.tsx:123`, and `package.json` has no `next-intl` dependency.

## Rubric Score For This Plan

| Dimension | Score | One-sentence justification |
|---|---:|---|
| 1. **Feasibility in 48h** | 9 | The plan keeps P0 to launch gates, observability, payment/report smoke, RAG citation checks, and copy polish instead of broad rewrites. |
| 2. **Technical depth** | 9 | It names the existing routes, migrations, scripts, schemas, and exact files that determine launch risk. |
| 3. **Sequencing** | 9 | It separates freeze, instrumentation, payment/report validation, UX polish, and launch gates with parallel lanes and explicit dependencies. |
| 4. **Testing rigour** | 8 | It uses existing Vitest, Playwright, bypass E2E, RAG comparison, Python smoke, payment idempotency, and a small realistic load model. |
| 5. **Domain fidelity (Vedic astrology)** | 8 | It treats Lahiri ayanamsa, lagna, Vimshottari dasha, hora, Choghadiya, Rahu Kaal, and scripture citation hygiene as launch-critical. |
| 6. **UX / design ambition vs realism** | 8 | It polishes existing dashboard/onboarding/report surfaces and avoids a prelaunch tab-system rebuild. |
| 7. **i18n / market fit** | 8 | It ships English with honest Hindi capture, Hindi glossary preparation, and existing INR/AED/USD geo-pricing rather than unsafe Hindi parity. |
| 8. **Observability** | 9 | It adds Sentry, PostHog, `/api/health`, alerting, and uses the already-present DB run logs. |
| 9. **Risk management** | 9 | It has concrete go/no-go gates, rollback rules, migration freeze, kill switches, and known-unknown handling. |
| 10. **Autonomy** | 9 | Aarsh only approves positioning/pricing copy and final staging; everything else runs from objective gates. |

## Launch Definition

Monday launch means:

1. A logged-in user can create a free Kundli preview and see a report without payment.
2. A logged-in user can pay through Ziina for a 7-day plan, return through `/api/ziina/verify`, and generate a paid report without using placeholder commentary.
3. A paid report displays Lahiri-based lagna, Moon sign, Vimshottari dasha, daily hora/Choghadiya/Rahu Kaal timing, at least one scripture-grounded nativity citation when RAG is available, and a downloadable PDF.
4. Aarsh can see failures within minutes through Sentry, PostHog, `/api/health`, Supabase `generation_trace_id`, and `reports.generation_log`.
5. If a hard dependency fails, users see a clear retry/support path and no double-charge.

Anything else is post-launch unless it directly protects the above.

## P0 Scope

P0 work is launch-blocking and must finish by Monday morning:

- Production environment verification using `.env.example` as the checklist: Supabase, Ziina, Inngest, Upstash, Anthropic, fallback LLM, ephemeris URL, `JOB_TOKEN_SECRET`, and `BYPASS_SECRET`. The required production variables are documented at `.env.example:12`, `.env.example:31`, `.env.example:43`, `.env.example:68`, and `.env.example:78`.
- Add `/api/health` for public uptime checks. It should return JSON with `ok`, `version`, `supabase`, `ziina_configured`, `inngest_configured`, `upstash_configured`, `ephemeris`, and `anthropic_configured`. It should never expose secret values. It should return HTTP 200 for degraded non-critical analytics and HTTP 503 for report-blocking dependencies.
- Add Sentry and PostHog minimal instrumentation. Sentry captures unhandled server/client exceptions. PostHog captures only funnel-critical events: `onboarding_started`, `onboarding_step_completed`, `payment_intent_created`, `payment_returned`, `report_start_requested`, `report_generation_completed`, `report_generation_failed`, and `pdf_download_clicked`.
- Run and fix the existing launch test suite: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build:reliable`, `npm run test:playwright`, `npm run test:e2e:bypass`, and `npm run rag:compare`. These are already defined in `package.json:10`, `package.json:11`, `package.json:16`, `package.json:23`, and `package.json:25`.
- Payment smoke: create one Ziina intent, verify redirect finalization, verify duplicate finalize is idempotent, verify a user cannot mark a client-created report as `paid`. The RLS lock-down is in `supabase/migrations/20260514_lock_down_paid_report_status.sql:1`, and finalize idempotency is in `src/lib/ziina/finalizeIntent.ts:223`.
- RAG/citation smoke: run the existing RAG grounding tests, inspect one generated paid report, and confirm citations shown in `NativityCard` are grounded. The UI footnote path exists at `src/components/report/NativityCard.tsx:121` and `src/components/report/ScriptureFootnotes.tsx:21`.
- Dashboard/report/mobile polish only where needed. The dashboard already has tab state and reports/payments/settings tabs at `src/app/(app)/dashboard/page.tsx:44` and `src/app/(app)/dashboard/page.tsx:595`. The report page already has a sidebar and renders nativity/monthly/weekly/daily/synthesis sections at `src/app/(app)/report/[id]/page.tsx:1229` and `src/app/(app)/report/[id]/page.tsx:1340`. Do not rebuild it into a new tab architecture before launch.
- Honest Hindi market signal: English launch, Hindi waitlist, glossary draft. Do not restructure routing with `next-intl` before Monday.
- No broad refactor of `src/lib/reports/orchestrator.ts` or `src/app/api/reports/start/route.ts` unless a specific failing gate requires it. Those files are large, but they are also the working launch path.

## Product And Market Research

The research goal is not to discover a new product in 48 hours. It is to decide what to emphasize from the product that already exists.

Run a four-hour evidence sprint on Saturday:

- Review 6 direct Jyotish/Kundli competitors: AstroSage, Astrotalk, ClickAstro, mPanchang, DrikPanchang, and PocketPandit.
- Review 2 adjacent AI astrology products: Co-Star and Sanctuary. They are Western or modern astrology, so use them only for onboarding, paywall, retention, and notification mechanics.
- Capture four fields only: first-screen promise, free value, paid trigger, and trust proof.
- Produce one positioning decision: VedicHour is not "AI astrology chat." It is "free Kundli plus hour-by-hour Jyotish timing grounded in Lahiri calculations and classical source references."

Copy should lead with:

- Free Kundli first. The repo already targets that keyword in metadata and FAQ at `src/app/(marketing)/page.tsx:10` and `src/lib/faq-data.ts:19`.
- Specificity: 18 hourly windows per day, hora, Choghadiya, Rahu Kaal, current city local time. The landing preview already exposes the hourly concept at `src/components/landing/HourlyPreview.tsx:60`.
- Trust: Swiss Ephemeris, Lahiri ayanamsa, Vimshottari dasha, and source-grounded commentary. The landing page already names these at `src/components/landing/Hero.tsx:37` and `src/lib/faq-data.ts:11`.
- Clear payment value: free preview, 7-day, monthly, annual. Prices already exist in `src/lib/pricing.ts:17` and Ziina plan definitions at `src/lib/ziina/server.ts:26`.

Do not ship fake testimonials. If real quotes are not ready by Monday 06:00, use product proof instead: sample hourly grid, sample citation footnote, refund policy, privacy policy, and visible support email. The FAQ already promises a 24-hour refund at `src/lib/faq-data.ts:43`, so support operations must be able to honor that manually.

## Knowledge, RAG, And Citation Hygiene

The domain risk is not "RAG absent." It is citation quality. Existing prompts ask the model to produce `[[SOURCE:CHAPTER:VERSE]]` markers in `NativityAgent` and `ForecastAgent` at `src/lib/agents/NativityAgent.ts:25`, `src/lib/agents/NativityAgent.ts:61`, and `src/lib/agents/ForecastAgent.ts:80`. That is useful only if retrieved chunks actually contain stable chapter/verse metadata. If not, the model can invent verse numbers while still sounding scholarly.

P0 RAG actions:

1. Run `npm run test -- src/__tests__/ragGrounding.test.ts` and `npm run rag:compare`.
2. Generate one fresh paid or bypass report with `jyotishRagMode=hybrid` and inspect nativity output for source markers.
3. Validate every displayed citation marker against retrieved context. If a marker cannot be tied to metadata, downgrade display copy from "verse" to "source reference" before launch.
4. Confirm no report contains invented source titles. Allowed source families for launch: Brihat Parashara Hora Shastra/BPHS, Phaladeepika, Jaimini Sutras, and the curated Muhurta material already in the corpus.
5. Keep retrieval mode hybrid by default, with keyword fallback. `resolveJyotishRagMode` already defaults hybrid unless disabled at `src/lib/rag/ragMode.ts:32`.

No P0 corpus expansion. The cleaned chunks are present and the test expects a large BPHS corpus. Expanding corpus right before launch risks OCR noise and mismatched citations. Post-launch, add a formal 50-question retrieval evaluation and a glossary; for Monday, do a smaller 12-prompt manual audit:

- Lagna analysis for Aries, Cancer, Libra, Pisces.
- Vimshottari dasha with Rahu, Jupiter, Saturn, Mercury.
- Hora and Choghadiya rationale.
- Rahu Kaal safe-use wording.
- Remedy refusal: no medical, legal, or guaranteed outcome claims.
- Ashtakoot/synastry source boundaries.

## Testing And Release Gates

The testing model must match the product. A report is a long-running multi-provider workflow, not a high-RPS CRUD endpoint.

P0 commands:

```bash
npm run typecheck
npm run lint
npm run test
npm run build:reliable
npm run test:playwright
npm run test:e2e:bypass
npm run rag:compare
```

The bypass E2E is intentionally valuable because it exercises `/api/reports/start` and report status polling without card network friction at `e2e/report-generation-bypass.spec.ts:30`. Public smoke tests cover marketing/legal pages and redirect behavior at `e2e/smoke.spec.ts:4` and `e2e/smoke.spec.ts:41`.

P0 additions if engineering time permits:

- A unit test for Ziina webhook replay around `src/app/api/ziina/webhook/route.ts:97` and `src/app/api/ziina/webhook/route.ts:117`.
- A Playwright mobile-only onboarding smoke that fills `/onboard`, geocodes birth/current city, selects free, and reaches `/report/...`.
- A Python smoke wrapper using FastAPI `TestClient` for `/health`, `/natal-chart`, `/hora-schedule`, `/rahu-kaal`, and `/generate-daily-grid`. Existing Python scripts are not CI-grade pytest, but the engine routes and calculations are stable enough to wrap quickly.

Load model:

- Do not run 200 RPS against report generation. That is the wrong metric.
- Run 20 concurrent `/api/reports/start` calls using bypass against staging only if cost controls are confirmed. Expect 202 from Inngest or clear 503 if Inngest is not configured.
- Run 50 requests/minute against `/api/health`, `/api/geo`, and marketing pages. These are the actual traffic burst paths.
- Report completion SLO follows the operations runbook: 7-day report P95 under 180 seconds and report success rate above 95 percent at `docs/architecture/OPERATIONS_RUNBOOK.md:24`.

## Refactor Loop

The launch refactor rule is simple: no broad extraction from the report pipeline before Monday.

`src/lib/reports/orchestrator.ts` is large and handles checkpoints, paid fallback rejection, RAG, LLM fallback, months/weeks/days, trace ids, and final persistence. It also has crucial paid-report placeholder guards at `src/lib/reports/orchestrator.ts:339`, `src/lib/reports/orchestrator.ts:398`, and `src/lib/reports/orchestrator.ts:1823`. `src/app/api/reports/start/route.ts` is similarly dense but already enforces rate limits, locks, Inngest dispatch, and payment trust at `src/app/api/reports/start/route.ts:168`, `src/app/api/reports/start/route.ts:236`, `src/app/api/reports/start/route.ts:341`, and `src/app/api/reports/start/route.ts:512`.

P0 changes are allowed only under this loop:

1. Reproduce failing gate.
2. Patch the smallest file set.
3. Add or update the nearest test.
4. Run the targeted test plus `npm run typecheck`.
5. If the patch touches payment/report generation, run bypass E2E.

Allowed P0 refactors:

- Extract a pure helper only when it removes a tested bug.
- Add health and analytics files.
- Add small UI state fixes in onboarding/dashboard/report.
- Add docs or runbook updates.

Disallowed until after launch:

- Splitting the whole orchestrator.
- Replacing the report page navigation model.
- `next-intl` route restructuring.
- Payment provider abstraction.
- New database migrations except a truly necessary non-destructive observability migration.

## Dashboard And Report UX

P0 UX work should finish the current surfaces, not invent new ones.

Dashboard:

- Keep the current Overview/Reports/Payments/Settings tabs. They are deep-linkable through `?tab=` at `src/app/(app)/dashboard/page.tsx:345`.
- Add one visible "Generate new report" button in the empty and non-empty reports views.
- Ensure failed/stale reports show retry/support guidance. `ReportPipelineLogDetails` already exposes generation logs at `src/app/(app)/dashboard/page.tsx:148`.
- Verify reports list, payment rows, and settings inputs at 320px, 375px, 414px, 768px, and 1280px.

Report page:

- Keep the current sidebar plus section scroll. It already renders `ReportSidebar`, `NativityCard`, `MonthlyAnalysis`, `WeeklyAnalysis`, `DailyAnalysis`, and `PeriodSynthesis`.
- Daily forecast already has per-day tabs at `src/components/report/DailyAnalysis.tsx:153`. Do not add a second full report tab system unless screenshots show the page is unusable.
- Make the PDF button and copy-link affordance obvious on mobile.
- Confirm NativityCard footnotes render under lagna and dasha text. The footnote component starts at `src/components/report/ScriptureFootnotes.tsx:21`.
- Ensure the "generation failed" state exposes `generation_trace_id`, a retry CTA, and support copy. The report page already logs generation failures with trace ids at `src/app/(app)/report/[id]/page.tsx:208`.

Onboarding:

- The current form is already three-step: identity, birth details, plan at `src/app/onboard/_OnboardForm.tsx:48`, `src/app/onboard/_OnboardForm.tsx:123`, `src/app/onboard/_OnboardForm.tsx:217`, and `src/app/onboard/_OnboardForm.tsx:378`.
- Add autosave to `sessionStorage` for form state, distinct from the existing Ziina return storage at `src/app/onboard/_OnboardForm.tsx:871`.
- Add "I do not know exact birth time" as a real toggle, not just hint text. The current hint says use 12:00 at `src/app/onboard/_OnboardForm.tsx:241`; the launch version should store an `approx_birth_time` flag and show a report confidence note.
- Capture PostHog step events without blocking navigation.

## Marketing And Conversion

Marketing P0 is content ordering and trust, not a new landing page.

Landing sections stay. Update copy only where evidence demands it:

- First screen: "Free Kundli and hourly Jyotish timing" rather than a vague AI promise.
- Subcopy: "Lahiri ayanamsa, Vimshottari dasha, hora, Choghadiya, Rahu Kaal, and source-grounded interpretation."
- Above the fold: CTA to free Kundli. Paid plan CTA can be secondary.
- Pricing: use existing multi-currency table. Do not hard-code INR only because `src/lib/pricing.ts:17` and `src/app/api/geo/route.ts:13` already support USD/INR/AED.
- FAQ: keep safety, refund, birth data, and payment method answers. They already exist at `src/lib/faq-data.ts:39`, `src/lib/faq-data.ts:43`, and `src/lib/faq-data.ts:51`.
- Footer: support email, terms, privacy, refund.

No fake scarcity. No fake "charts decoded" count. No fake testimonials. If proof is needed, show a sample report excerpt generated from anonymized test data and a visible source footnote.

## Payments

Payment launch path is Ziina redirect verification first; webhook second.

- `/api/ziina/create-intent` creates server-side payment records and returns redirect details at `src/app/api/ziina/create-intent/route.ts:16`.
- `/api/ziina/verify` is the primary completion path after checkout. It looks up the stored binding, verifies the intent with Ziina, finalizes idempotently, and redirects at `src/app/api/ziina/verify/route.ts:9` and `src/app/api/ziina/verify/route.ts:90`.
- `/api/ziina/webhook` is optional for Ziina Business. The route explicitly says Individual/API-only plans finalize through `/api/ziina/verify` at `src/app/api/ziina/webhook/route.ts:36`.
- Webhook replay protection exists through `ziina_webhook_events` at `supabase/migrations/20260421_ziina_webhook_events.sql:1` and code at `src/app/api/ziina/webhook/route.ts:97`.

P0 payment checklist:

- Confirm `ZIINA_API_TOKEN` is production, not placeholder.
- Confirm `NEXT_PUBLIC_URL` is `https://www.vedichour.com`, not localhost.
- Confirm `UPSELL_ENABLED` desired behavior before launch.
- Create one low-value/test intent if Ziina supports it. If not, use the smallest live flow and refund manually.
- Verify repeated `/api/ziina/verify` call is harmless.
- Verify dashboard Payments tab shows the completed row.
- Publish a manual refund SOP for support. Do not build `/api/admin/refund` before Monday unless Ziina refund API and auth are already proven.

## i18n And Market Fit

Hindi parity is not a 48-hour task. Bad Hindi Jyotish is worse than no Hindi.

Monday:

- English only.
- Add "Hindi reports are coming" waitlist CTA on landing, pricing, and after free preview.
- Prepare `docs/translation-glossary.md` with terms not to translate blindly: Lagna, Rashi, Graha, Bhava, Nakshatra, Vimshottari Dasha, Mahadasha, Antardasha, Hora, Choghadiya, Rahu Kaal, Muhurta, Panchang, Ayanamsa.
- Keep INR/AED/USD auto-pricing live. This is already meaningful market fit for India, UAE, and global users.

Post-launch:

- Add `next-intl` only after route-level QA. Locale prefixes touch routing, middleware, canonical URLs, metadata, sitemap, auth redirects, and payment return URLs. That is too much blast radius for Sunday night.
- Translate glossary first, onboarding second, report UI third, generated report prompts last.
- Have a human Jyotish/Hindi reviewer approve generated examples before shipping `/hi`.

## Observability

P0 observability is a launch requirement.

Add:

- `@sentry/nextjs` with client/server/edge config, `NEXT_PUBLIC_SENTRY_DSN`, source maps when safe, and alerts for error spikes.
- `posthog-js` and optionally server-side capture for API events. Keep the event list short.
- `/api/health/route.ts`.
- Uptime monitor hitting `/api/health` every 1 minute.
- Sentry alerts: `report_generation_failed` exception, payment finalization exception, health endpoint 503, and report start 503.
- PostHog funnel: onboarding start -> payment intent -> payment returned -> report start -> complete -> PDF.

Use existing DB observability:

- `report_runs` for phase and duration.
- `agent_runs` for provider-level failures.
- `generation_trace_id` for support correlation.
- `reports.generation_log` for user-visible pipeline logs.

CSP must be updated when Sentry/PostHog are added. Current CSP connect-src only includes Supabase, Anthropic, Google Maps, OpenCage, and Ziina at `next.config.mjs:46`; Sentry and PostHog endpoints will be blocked unless added.

## Agent Topology

Use five lanes. Do not let agents edit overlapping critical files at the same time.

| Lane | Owner | Write scope | Output |
|---|---|---|---|
| Release Captain | Architect | `.launch-plan`, runbook, gate checklist | P0 board, go/no-go calls |
| Platform | Senior backend | health, Sentry, PostHog, CSP, env checks | production visibility |
| Payments | Backend | Ziina smoke, refund SOP, payment tests | payment confidence |
| Product/UI | Frontend | landing copy, dashboard/report/onboarding polish | conversion and mobile polish |
| Domain/QA | Jyotish QA | RAG tests, ephemeris smoke, report audit | domain correctness |

Critical path stays with Platform plus Payments plus Domain/QA. Product/UI can run in parallel as long as it does not touch payment or orchestrator code.

Aarsh approvals:

1. Saturday 2026-05-16 evening: positioning/pricing/refund copy.
2. Sunday 2026-05-17 night: final staging smoke.

No other approval is needed unless a P0 gate fails and requires postponement.

## Timeline

All dates below use the Saturday 2026-05-16 to Monday 2026-05-18 launch window.

### Saturday 2026-05-16, Hours 0-6: Freeze And Facts

- Freeze feature scope.
- Confirm secrets and deploy target.
- Run baseline CI commands locally/staging.
- Run one bypass report.
- Run RAG grounding tests.
- Produce competitor evidence sprint and copy decision.
- Aarsh approves positioning and refund/payment copy.

### Saturday 2026-05-16, Hours 6-14: Visibility And Payment

- Add `/api/health`.
- Add Sentry and PostHog minimal instrumentation.
- Update CSP for telemetry.
- Run Ziina create-intent/verify smoke.
- Verify dashboard Payments tab.
- Verify no client path can write `payment_status=paid`.
- Draft refund SOP.

### Sunday 2026-05-17, Hours 14-28: Report, RAG, Mobile

- Generate fresh free and paid/bypass reports.
- Inspect Lahiri lagna, dasha, hora, Choghadiya, Rahu Kaal, citations, and PDF.
- Fix only P0 UI breakage on onboarding, dashboard, and report page.
- Add Hindi waitlist/glossary, not full i18n.
- Run Playwright desktop/tablet/mobile.

### Sunday 2026-05-17, Hours 28-38: Staging Freeze

- Deploy staging candidate.
- Run full command suite.
- Run production-like health and bypass E2E.
- Confirm Sentry receives a test error.
- Confirm PostHog funnel events appear.
- Aarsh reviews staging.
- Freeze code except P0 fixes.

### Monday 2026-05-18, Hours 38-48: Launch

- Final smoke: health, login, onboard free, Ziina paid, report generation, PDF, dashboard.
- Confirm alerts are armed.
- Launch.
- Watch first 20 reports and first 5 paid attempts.
- If any P0 gate fails, postpone to Monday 18:00 rather than ship blind.

## Go / No-Go Gates

| Gate | Go | No-go |
|---|---|---|
| Build | typecheck, lint, Vitest, reliable build pass | any compile/runtime build failure |
| Payment | Ziina create/verify completes, duplicate verify harmless, paid report status server-written only | payment ambiguity, double-charge risk, or client can mark paid |
| Report | free and paid/bypass report complete, no placeholder paid text, PDF works | report stuck, placeholder paid commentary, missing PDF |
| Domain | Lahiri lagna/dasha/hora/Choghadiya/Rahu Kaal visible and sane; citations not invented | Western/tropical language, wrong dasha, invented scripture |
| Observability | `/api/health`, Sentry, PostHog, trace id, run logs verified | failures invisible |
| Mobile | onboarding and report usable at 320/375/414/768 widths | blocked CTA, overflow, unreadable payment/report state |
| Legal/support | privacy, terms, refund, support email visible | refund promise unsupported |

## Rollback And Kill Switches

- Roll back web deploy through Vercel if post-launch error rate spikes.
- Avoid destructive DB migrations in the launch window.
- Keep `REPORT_START_REQUIRE_INNGEST` strict in production unless Aarsh explicitly accepts inline fallback risk.
- Use `UPSELL_ENABLED=false` if upsell creates checkout/report confusion.
- Use `NEXT_PUBLIC_SKIP_VALIDATION` only as already documented; do not hide paid-report placeholder failures.
- If RAG degrades, switch `JYOTISH_RAG_MODE=keyword` rather than `off` unless RAG itself is causing report failures.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---:|---:|---|
| Ziina webhook expectations wrong for current plan | Medium | High | Treat redirect verify as primary; webhook optional by design. |
| LLM quota or latency breaks report completion | Medium | High | Use fallback chain, Inngest retries, trace ids, and clear retry UI. |
| Citation markers invent chapter/verse | Medium | High | Manual audit; downgrade citation display to source-level if metadata is not stable. |
| Broad refactor destabilizes launch | High | High | No broad orchestrator/start extraction before Monday. |
| Hindi copy damages trust | Medium | Medium | English launch plus waitlist/glossary only. |
| Telemetry blocked by CSP | Medium | Medium | Update `connect-src` when adding Sentry/PostHog. |
| Exact birth time unknown | High | Medium | Add approximate-time flag and confidence note. |
| First paid user gets stuck generating | Medium | High | Health, report logs, stale cleanup, manual support SOP. |

## Post-Launch Roadmap

### Week 1

- Review first 100 free reports and first 20 paid reports.
- Build a formal 50-question RAG retrieval eval.
- Add pytest coverage for ephemeris routes.
- Add webhook replay and payment verify tests.
- Start human Hindi translation review from the glossary.
- Add real testimonials only after explicit user consent.
- Add a support dashboard view by `generation_trace_id`.

### Weeks 2-3

- Implement `next-intl` with `/en` and `/hi` only after auth/payment redirects are tested.
- Move to structured citations tied to chunk ids rather than model-invented chapter/verse markers.
- Refactor `orchestrator.ts` phase by phase with golden report snapshots.
- Add visual regression snapshots for landing, onboarding, dashboard, and report.
- Add pricing experiments in PostHog after baseline conversion is known.

### Month 1

- Programmatic SEO for high-intent Jyotish pages, but only where the content is accurate and not doorway spam.
- Synastry/ashtakoot expansion with domain review.
- Email notifications for completed reports and failed generation recovery.
- Admin refund tooling only after manual SOP volume proves it is needed.
- Real RUM dashboard with error budget and weekly launch-readiness review.
