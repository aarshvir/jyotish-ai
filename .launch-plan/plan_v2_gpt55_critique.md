# Critique of Plan v1 - Opus 4.7

**Reviewed plan:** `.launch-plan/plan_v1_opus.md`  
**Reviewer:** GPT-5.5 second-opinion architect  
**Launch target:** Monday 2026-05-18  
**Verdict:** Useful audit, overbroad execution plan. It correctly recognizes the repo is mature, but it turns a 48-hour launch into a multi-workstream platform upgrade.

## Rubric Score For The Opus 4.7 Plan

| Dimension | Score | One-sentence justification |
|---|---:|---|
| 1. **Feasibility in 48h** | 5 | The plan tries to ship broad refactors, next-intl, Sentry, PostHog, 12 E2Es, Python coverage, RAG eval, payment hardening, UX changes, and marketing polish in one weekend. |
| 2. **Technical depth** | 8 | It names many concrete files and systems, but several file names and current-state assumptions are wrong or stale. |
| 3. **Sequencing** | 6 | The three-wave model is clear, but the build wave overloads critical-path engineering and underestimates cross-dependency risk. |
| 4. **Testing rigour** | 8 | The test ambitions are strong, but too much of the suite is new, expensive, or mis-sized for a Monday launch. |
| 5. **Domain fidelity (Vedic astrology)** | 7 | It uses the right Vedic concepts, but treats citation surfacing as easier than the actual chapter/verse hygiene problem. |
| 6. **UX / design ambition vs realism** | 6 | It avoids a full redesign, which is right, but still proposes a report dashboard rebuild without first using the existing dashboard/report structure. |
| 7. **i18n / market fit** | 6 | It is right to reject full Hindi parity, but it misreads currency support and proposes a risky next-intl route refactor before launch. |
| 8. **Observability** | 8 | Sentry, PostHog, health endpoints, and alerts are the right missing pieces, but it underuses existing DB observability and misses CSP impact. |
| 9. **Risk management** | 6 | It has gates and rollback, but its own refactor/test/i18n scope creates avoidable launch risk. |
| 10. **Autonomy** | 7 | Two approvals is good, but the scope depends on many uncertain integrations and assumed agent skills. |

## Executive Verdict

Opus v1 is directionally right on the audit: the repo already has Ziina, pgvector/RAG, scriptures, Inngest, Upstash, checkpoints, Playwright, Vitest, CSP, trace ids, and migrations. That matters because many weaker plans would waste the weekend rebuilding systems that exist.

The problem is execution sizing. Opus classifies too much as P0. Its P0 list includes broad extraction of `orchestrator.ts`, a full `next-intl` scaffold, 12 new E2E specs, Python coverage targets, Sentry and PostHog, health endpoints, dashboard tabs, payment replay tests, refund API, market research, RAG eval harness, and landing changes. Each item is defensible in isolation. Together, they are not a 48-hour launch plan.

The biggest architectural disagreement: do not refactor the report pipeline before Monday unless a launch gate fails. `src/lib/reports/orchestrator.ts` and `src/app/api/reports/start/route.ts` are large, but they also contain working checkpoint, paid-report guard, Inngest, lock, rate-limit, and trace behavior. Splitting them in the final 24 hours is more likely to create a subtle regression than prevent one.

## Section-By-Section Verdict

| Opus section | Verdict | Reason |
|---|---|---|
| 0. Reality check | Mostly right | It correctly states the codebase is mature and rejects full Hindi parity. It overstates "top decile" design without evidence and incorrectly treats currency switcher as absent. |
| 1. Workstream map | Too broad | Ten workstreams are fine as a taxonomy, but too many are P0. This should be launch-gate driven, not workstream-complete driven. |
| 2. Agent topology | Over-specified | The topology is readable, but it references skill names and roles not present in this repo context. It also lacks disjoint write ownership for risky files. |
| 3.1 Product / market research | Useful but too large | Competitor teardown is good for copy, not for building new features. Eight sites plus review mining is too much before Saturday gate. |
| 3.2 Knowledge / RAG | Strong direction, wrong scale | RAG is already wired; the right P0 is citation audit and small report smoke. A 50-question eval is post-launch unless already prepared. |
| 3.3 Testing | Good instincts, unrealistic workload | Defense in depth is right. Adding 12 E2Es, pytest coverage, load tests, and new CI workflows is not a weekend launch requirement. |
| 3.4 Refactor loop | Sharp no | Broad extraction of `orchestrator.ts` and `/api/reports/start` is the highest-risk part of v1. Leave working pipeline code alone until after launch. |
| 3.5 Dashboard UX | Partly stale | It says to verify whether the report page is single-scroll or tabbed, but the repo already has a tabbed dashboard and daily report tabs. Polish, do not rebuild. |
| 3.6 Marketing / landing | Mostly good | The landing structure exists. Copy polish is useful. Placeholder testimonials and unverifiable credibility bars must not ship. |
| 3.7 Payments hardening | Mostly good, one overreach | Ziina hardening and idempotency are right. Building an admin refund route before launch is unnecessary risk; manual refund SOP is enough. |
| 3.8 i18n scaffolding | Too risky | Hindi waitlist and glossary are right. `next-intl` route restructuring can break auth redirects, canonical URLs, sitemap, and payment returns. |
| 3.9 Onboarding | Good, but under-recognizes current state | The app already has a 3-step onboarding flow, birth/current geocoding, plan selection, and Ziina return storage. P0 is autosave and unknown-time handling. |
| 3.10 Observability | Good | Sentry, PostHog, `/api/health`, and alerts are needed. It should also explicitly update CSP and leverage `report_runs`/`generation_log`. |
| 4. Day-by-day timeline | Overloaded | The timeline compresses too many first-time changes into Sunday. It leaves too little freeze time. |
| 5. Go/no-go gates | Too few | Market brief and staging approval are not enough. Need separate env, payment, report, domain, observability, mobile, and legal gates. |
| 6. Post-launch roadmap | Reasonable | Week 1 items are useful, though pricing A/B should wait for enough baseline traffic. |
| 7. Out-of-scope | Mostly right | It is right on Hindi parity, open-ended agents, and redesign. It is wrong that currency switcher is simply post-launch, because geo-pricing already exists. |
| 8. Risks | Incomplete | It misses citation hallucination, CSP blocking telemetry, Ziina plan-mode ambiguity, exact birth time uncertainty, and the risk of its own refactor scope. |
| 9. Approvals | Good | Two user approvals is the right target. |
| 10. Pushback | Good | The pushback on "no 1-in-1M failure" and "top 0.001% design" is correct. |
| 11. Appendix | Too much write surface | The appendix is useful as a roadmap, not as P0. It also contains file-name errors. |

## Audit Facts: Correct And Incorrect

Opus is correct on the audit facts Aarsh called out:

- Ziina, not Razorpay, is the active payment path. Ziina plan definitions live at `src/lib/ziina/server.ts:26`, the create intent route is `src/app/api/ziina/create-intent/route.ts:16`, and the verify route is `src/app/api/ziina/verify/route.ts:9`.
- pgvector RAG is wired. The 768-dim migration is `supabase/migrations/20260425_jyotish_scriptures_768dim.sql:1`, and the app default is 768 dimensions at `src/lib/rag/vectorSearch.ts:22`.
- The scripture corpus exists. The RAG test expects more than 1000 corpus entries and more than 1000 BPHS/Parashara entries at `src/__tests__/ragGrounding.test.ts:9`.
- Inngest is in place. The client exists at `src/lib/inngest/client.ts:12`, the report generation function starts at `src/lib/inngest/functions.ts:100`, and `/api/inngest` serves it at `src/app/api/inngest/route.ts:21`.
- Playwright and Vitest are in place. Scripts and deps are in `package.json:11`, `package.json:23`, `package.json:58`, and `package.json:69`.

The factual or near-factual errors in Opus v1:

1. **Currency support is not absent.** v1 says currency switcher is absent at `.launch-plan/plan_v1_opus.md:16` and moves currency switcher out of scope at `.launch-plan/plan_v1_opus.md:358`. The repo already auto-detects country and forwards `x-currency` in `middleware.ts:13`, uses USD/INR/AED price tables at `src/lib/pricing.ts:17`, and fetches `/api/geo` on pricing at `src/components/landing/Pricing.tsx:85`. What is absent is a manual user-facing currency picker, not currency support.
2. **RAG script file names are wrong.** v1 says `scripts/embed-chunks.ts` and `scripts/chunk-scriptures.ts` exist at `.launch-plan/plan_v1_opus.md:127`. Actual files are `scripts/run-embed-chunks.ts` and `scripts/chunk-scriptures.mjs`, with package scripts at `package.json:17` and `package.json:18`.
3. **LOC numbers are stale.** v1 says `orchestrator.ts` is 2129 LOC and `/api/reports/start` is 678 LOC at `.launch-plan/plan_v1_opus.md:178`. In this worktree, they are 1992 and 631 lines. The strategic conclusion may still hold, but the exact numbers are wrong.
4. **Dashboard uncertainty is stale.** v1 says it needs to verify whether the report page is single-scroll or already tabbed at `.launch-plan/plan_v1_opus.md:206`. The dashboard has explicit tab state at `src/app/(app)/dashboard/page.tsx:44` and a rendered tab bar at `src/app/(app)/dashboard/page.tsx:595`. The report daily section also has day tabs at `src/components/report/DailyAnalysis.tsx:153`.
5. **Webhook language needs Ziina plan nuance.** v1 asks what happens "if Ziina webhook never arrives" at `.launch-plan/plan_v1_opus.md:247`. The webhook route explicitly says Individual/API-only Ziina should not register a webhook and must finalize through GET `/api/ziina/verify` at `src/app/api/ziina/webhook/route.ts:36`.
6. **Python tests are underspecified, not absent in the plain-English sense.** There are Python validation scripts such as `ephemeris-service/test_v3_fixes.py`, but there is no pytest suite or CI integration. v1 should have said "no pytest/CI Python tests," not simply "No Python tests" at `.launch-plan/plan_v1_opus.md:134`.
7. **Citation surfacing is partly already implemented.** v1 implies citation surfacing needs structured extraction at `.launch-plan/plan_v1_opus.md:123`. Nativity citation extraction and footnotes already exist at `src/components/report/NativityCard.tsx:121` and `src/components/report/ScriptureFootnotes.tsx:21`. The real gap is citation truthfulness and broader section coverage.

## Missing Items

The plan misses or underweights these launch-critical items:

- **Environment gate.** The plan should start with a production secret checklist. `.env.example` documents Ziina, Inngest, Upstash, fallback LLM, ephemeris, and stale cleanup expectations at `.env.example:12`, `.env.example:31`, `.env.example:43`, `.env.example:56`, `.env.example:68`, and `.env.example:82`.
- **Public health endpoint.** v1 proposes `/api/health`, but does not specify shape, dependency severity, no-secret response rules, or uptime monitor behavior.
- **CSP update for telemetry.** Adding Sentry/PostHog will fail silently if `connect-src` is not updated. Current CSP connect-src is at `next.config.mjs:46`.
- **Use existing observability.** v1 acts like Sentry/PostHog are the entire observability story. The repo already has `report_runs`, `agent_runs`, `generation_log`, and trace ids at `src/lib/observability/reportRuns.ts:31` and `src/lib/observability/generationLog.ts:29`.
- **Citation hygiene.** Retrieval is not enough. The current prompt asks for `[[SOURCE:CHAPTER:VERSE]]`; if the retrieved chunk lacks exact verse metadata, the model can invent a scholarly-looking citation. That is a launch trust risk.
- **Manual refund SOP.** v1 jumps to an admin refund route. The app already publicly promises a 24-hour refund in FAQ at `src/lib/faq-data.ts:43`; the Monday requirement is an operational SOP, not necessarily code.
- **Payment return URL and canonical origin.** Ziina verify and report extension depend on correct origin. `/api/ziina/verify` uses canonical dispatch origin at `src/app/api/ziina/verify/route.ts:24`.
- **Approximate birth time.** v1 mentions the concern, but does not turn it into a launch data flag. Current onboarding text tells users to use 12:00 if unknown at `src/app/onboard/_OnboardForm.tsx:241`; launch should store the uncertainty explicitly.
- **Telemetry privacy.** Birth date/time/city and report text should not be sent raw to PostHog/Sentry. Only ids, plan type, status, error bucket, and trace id should go to external telemetry.
- **Migration freeze.** v1 says no P0 migrations, but the gates should explicitly forbid destructive DB work and define rollback if a non-destructive migration becomes necessary.
- **Support workflow.** First paid failures need a path: trace id, user email, payment id, report id, refund or retry action.

## Over-Reach Items

These are not bad ideas; they are too much for the final 48 hours:

- Broad extraction of `src/lib/reports/orchestrator.ts` into multiple modules.
- Broad extraction of `src/app/api/reports/start/route.ts`.
- 50-question RAG eval with retrieval@5 target.
- 12 new critical-path E2E specs.
- Python pytest line coverage target of 70 percent.
- New Python CI workflow and nightly E2E workflow.
- k6/autocannon load test with 200 RPS or even 50 VU against report generation.
- Full `next-intl` route scaffolding and English string extraction.
- Admin refund route.
- Placeholder testimonials.
- New report dashboard tab architecture.
- Component testing stack.
- Multi-PSP payment architecture.
- Pricing A/B test in week 1 before baseline conversion volume exists.

The launch version should convert these into post-launch roadmap items, except Sentry, PostHog, health, payment smoke, report smoke, and mobile smoke.

## Sharpest Five Disagreements

1. **Do not refactor the report pipeline before Monday.** v1 treats `orchestrator.ts` and `/api/reports/start` extraction as P0. I would make that explicitly forbidden unless a failing launch gate requires a tiny extraction. The pipeline already has checkpoint resume at `src/lib/reports/orchestrator.ts:873`, paid fallback guards at `src/lib/reports/orchestrator.ts:339`, and Inngest dispatch at `src/app/api/reports/start/route.ts:529`.

2. **Treat citation truth as more important than retrieval score.** v1 focuses on retrieval@5. The higher launch risk is generated citations that look precise but are not proven by metadata. The prompt asks for chapter/verse markers at `src/lib/agents/NativityAgent.ts:25`; that must be audited or softened.

3. **Do not ship next-intl scaffolding before Monday.** v1 wants locale routing, `/en`, `/hi`, and string extraction as P0. That touches routing, layout, canonical URLs, auth redirects, payment returns, and sitemap. Ship a Hindi waitlist and glossary, then localize after launch.

4. **No fake or placeholder proof.** v1 proposes placeholder testimonial cards or a credibility bar "only if true" at `.launch-plan/plan_v1_opus.md:233`. The safer rule is stricter: no testimonials unless real and consented; no charts-decoded count unless instrumented and true.

5. **Load test the right thing.** v1's 200 RPS P1 and 50 VU P0-ish load model does not fit a long LLM pipeline. The useful launch tests are concurrent report-start dispatch, health endpoint uptime, payment verify idempotency, and actual report completion SLOs from the operations runbook at `docs/architecture/OPERATIONS_RUNBOOK.md:24`.

## Better P0 Replacement

If v1 had to be corrected without rewriting it completely, P0 should be:

1. Freeze risky refactors.
2. Verify production env and add `/api/health`.
3. Add Sentry and PostHog with CSP updates and no PII payloads.
4. Run existing CI, Playwright, bypass E2E, and RAG tests.
5. Smoke Ziina create-intent, verify, dashboard payment row, duplicate finalize.
6. Generate one free and one paid/bypass report; inspect domain correctness and citation truth.
7. Polish current onboarding/dashboard/report mobile states.
8. Update landing copy, refund/support copy, and Hindi waitlist.
9. Final staging freeze and go/no-go.

Everything else moves to week 1 or month 1.

## Scoring Notes

**Feasibility in 48h: 5/10.** The plan is not fantasy because the repo is mature and many tasks are small, but the total P0 write surface is too large. It would consume the stabilization window.

**Technical depth: 8/10.** It names concrete files, migrations, routes, libraries, and tests. The appendix is unusually specific. The penalty is for wrong file names, stale LOC numbers, and stale dashboard/currency assumptions.

**Sequencing: 6/10.** Discovery -> build -> stabilize is sane. The flaw is that Wave 2 contains too many unrelated risky changes, and the user smoke gate appears too late after substantial code churn.

**Testing rigour: 8/10.** The desired coverage is strong. The flaw is sizing: launch needs a smaller suite with higher confidence, not a large new test system that itself needs debugging.

**Domain fidelity (Vedic astrology): 7/10.** It knows lagna, dasha, hora, Choghadiya, Rahu Kaal, BPHS, and ayanamsa. It does not adequately challenge the current chapter/verse citation strategy.

**UX / design ambition vs realism: 6/10.** It correctly rejects a full redesign. It still overbuilds dashboard/report tabs and underrates current dashboard/onboarding structure.

**i18n / market fit: 6/10.** It is right to avoid full Hindi. It is wrong to treat currency support as missing, and `next-intl` routing is not a safe P0.

**Observability: 8/10.** The missing tools are correctly named. It should specify CSP, PII rules, health response shape, and integration with existing DB run logs.

**Risk management: 6/10.** There are gates and rollback, but the plan creates major refactor risk and misses several launch-specific failure modes.

**Autonomy: 7/10.** The two-approval target is good. The plan still needs too many implicit decisions because P0 is overloaded.

## Final Verdict

Opus v1 is a strong roadmap document and a decent audit. It is not a safe Monday launch plan. The best parts are the reality check, the refusal to promise full Hindi, the focus on observability, the recognition of Ziina/Inngest/RAG maturity, and the insistence on testing paid-report fallback behavior.

The parts to reject are the prelaunch orchestrator extraction, the full next-intl scaffold, the broad E2E/Python/load-test expansion, the admin refund route, fake proof placeholders, and the assumption that dashboard/report UX needs structural rebuild. A safer v2 keeps the pipeline intact, instruments it, proves payment/report/RAG through objective gates, and ships with honest English-first market fit.
