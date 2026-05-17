# Critique of Plan v3 - Opus Revised

## Overall Verdict

v3 is substantially better than v1 and mostly aligned with v2. It correctly accepts the big factual corrections: no orchestrator refactor, no dashboard tab rebuild, no `next-intl` launch scaffold, redirect-based Ziina verification, real citation risk, and no fake testimonials. I would not execute v3 as written, though. It still assumes a 24-hour window at `.launch-plan/plan_v3_opus_revised.md:6` and `.launch-plan/plan_v3_opus_revised.md:215`, while the current task requires a 12-18 hour final plan. It also adds enough observability, compliance, performance, support, test-script, and UI work that the critical path gets crowded again.

My score for v3: strong strategy, imperfect execution plan.

## Section-by-Section Verdict

**0. Acknowledged corrections:** Mostly correct and useful. The big exception is the line-count correction. v3 says the current files are 1992 and 631 LOC at `.launch-plan/plan_v3_opus_revised.md:19`, but this worktree has `src/lib/reports/orchestrator.ts` ending at `src/lib/reports/orchestrator.ts:2129` and `src/app/api/reports/start/route.ts` ending at `src/app/api/reports/start/route.ts:678`. Ironically, v1's numbers are the ones that match this checkout.

**1. Position statement:** Correct. v3's "protect Monday morning" framing at `.launch-plan/plan_v3_opus_revised.md:29` is the right launch principle.

**2. P0 scope:** Directionally good but too broad. Env verification, health, Sentry, citation truth, payment smoke, report smoke, and existing tests are valid P0. The dashboard CTA item is stale: the dashboard already has `+ New Report` at `src/app/(app)/dashboard/page.tsx:568`, an empty recent reports CTA at `src/app/(app)/dashboard/page.tsx:636`, a first-report CTA at `src/app/(app)/dashboard/page.tsx:735`, and an empty payments CTA at `src/app/(app)/dashboard/page.tsx:758`. The report failed-state item is also partly redundant: trace ids and retry/copy diagnostics already exist at `src/app/(app)/report/[id]/page.tsx:1081` and `src/app/(app)/report/[id]/page.tsx:1116`.

**3. Items removed from v1:** Correct. Removing orchestrator extraction, route extraction, broad `next-intl`, large E2E expansion, pytest coverage target, admin refund route, fake testimonials, currency switcher, and multi-PSP work is the right call.

**4. Items added:** The content audit, cost guardrails, support runbook, and PII/DPA posture are good additions. The performance budget is useful but too exact for the remaining time. Hard-blocking launch on mobile fast-3G LCP <= 2.0s at `.launch-plan/plan_v3_opus_revised.md:107` is not realistic as a Monday gate. Use Lighthouse and Web Vitals smoke, not a late-stage rewrite trigger.

**5. Pushback on v2:** The `messages/en.json` point is fine if unused. It is still not P0. The load-test point is right in spirit but wrong in execution: a bounded burst is useful, but v3's 20 concurrent bypass report starts with "all 202" at `.launch-plan/plan_v3_opus_revised.md:190` conflicts with the current per-user start limit of 3 per 60 seconds at `src/app/api/reports/start/route.ts:35` and `src/app/api/reports/start/route.ts:236`. Bypass auth maps all bypass calls to one user by default at `src/lib/api/requireAuth.ts:18` and `src/lib/api/requireAuth.ts:42`, so most of that burst should 429 unless the test uses distinct users or changes code.

**6. Real load model:** Better than v1's 200 RPS idea, but still over-scoped. Health endpoint burst is fine. Five Ziina create-intents may be acceptable in test mode. Twenty report starts is too costly and incompatible with rate limiting unless carefully designed.

**7. Agent topology:** Good for a larger team. For the final window, five lanes are okay only if their write scopes stay narrow. The Platform and Domain lanes are critical; Product/UI must not consume the schedule with new components.

**8. Timeline:** Not usable for the requested task. It is a 24-hour timeline starting Sun 02:00 at `.launch-plan/plan_v3_opus_revised.md:215`, not a 12-18 hour final plan starting now. It also pushes content audit to Mon 04:00 at `.launch-plan/plan_v3_opus_revised.md:224`, too late to recover before a 06:00 launch. Content approval needs to complete by roughly Mon 02:00.

**9. Risk register:** Strong. The hallucinated scripture risk, CSP telemetry risk, Anthropic spend spike, support overflow, stale privacy policy, and Inngest backlog are real.

**10. Self-score:** Too generous. v3 gives itself 88/100 at `.launch-plan/plan_v3_opus_revised.md:264`. I would score it 81/100 because feasibility and sequencing are weaker under the actual remaining window.

**11. Concrete file-level deltas:** Too many. v3 lists roughly ten additions plus many modifications at `.launch-plan/plan_v3_opus_revised.md:270`. The likely launch-critical file changes are fewer: health, Sentry/CSP, citation prompt/extractor/display, hero proof cleanup, footer support, privacy copy if telemetry ships. `scripts/burst-test-reports.mjs`, `scripts/burst-test-health.sh`, multiple runbooks, translation glossary, and new marketing components are not all P0.

**12. What stays frozen:** Correct. Freezing report pipeline files is essential. The only caveat is that v3's freeze list includes `/api/reports/start` while the burst-test idea may require rate-limit-aware behavior; do not edit the route for the burst test.

## Factual Errors

1. **LOC correction is wrong for this checkout.** v3 says orchestrator and start route are 1992 and 631 LOC at `.launch-plan/plan_v3_opus_revised.md:19`. Actual EOFs are `src/lib/reports/orchestrator.ts:2129` and `src/app/api/reports/start/route.ts:678`.

2. **20 concurrent bypass starts cannot expect all 202 under current auth/rate limit.** v3's pass condition says all 202 at `.launch-plan/plan_v3_opus_revised.md:190`. Current route allows 3 starts per 60 seconds at `src/app/api/reports/start/route.ts:35` and checks that limit before dispatch at `src/app/api/reports/start/route.ts:236`. Bypass uses one default user id at `src/lib/api/requireAuth.ts:18` and `src/lib/api/requireAuth.ts:42`.

3. **Dashboard CTA is already present.** v3 proposes adding a prominent dashboard "Generate new report" CTA at `.launch-plan/plan_v3_opus_revised.md:54`, but the dashboard already has several report-generation CTAs at `src/app/(app)/dashboard/page.tsx:568`, `src/app/(app)/dashboard/page.tsx:636`, `src/app/(app)/dashboard/page.tsx:735`, and `src/app/(app)/dashboard/page.tsx:758`.

4. **Report failed-state diagnostics are already largely present.** v3 proposes adding failed-state trace id, retry CTA, and support email surface at `.launch-plan/plan_v3_opus_revised.md:54`. The report page already shows support trace ids at `src/app/(app)/report/[id]/page.tsx:1081`, pipeline logs for support at `src/app/(app)/report/[id]/page.tsx:1098`, and copy diagnostics plus retry buttons at `src/app/(app)/report/[id]/page.tsx:1116`.

## Items v3 Over-Reaches On

- **PostHog as unconditional P0.** Adding PostHog plus cookie consent, privacy copy, CSP, event design, and PII scrubbing is more than a small launch task. Sentry is the P0. PostHog is P0 only if privacy and consent are completed early; otherwise it should wait.

- **Performance numbers as hard launch blockers.** The budget is useful, but LCP <= 2.0s on mobile fast 3G is an optimization target, not a no-go gate for an 18-hour launch.

- **Approximate birth-time storage.** The UI already warns about approximate time at `src/app/onboard/_OnboardForm.tsx:225` and `src/app/onboard/_OnboardForm.tsx:240`. Persisting a new flag is useful, but the start route currently upserts known report fields at `src/app/api/reports/start/route.ts:379`; new persistence is not free.

- **Too many new files.** v3's additions list at `.launch-plan/plan_v3_opus_revised.md:272` includes scripts, runbooks, translation glossary, and marketing components. That is not the minimum Monday delta.

## Items v3 Still Misses

- **The current hero already has fake-looking proof.** v3 bans fake proof, but it does not explicitly call out that `TRUST_STATS` hard-codes "12,000+ charts generated" and "4.8 from 340+ seekers" at `src/components/landing/Hero.tsx:5`. Removing that is a concrete P0.

- **The citation renderer itself cannot represent source-only truth.** v3 correctly identifies citation truth, but the fix must include extractor and UI changes. The parser only accepts `SOURCE:CHAPTER:VERSE` at `src/lib/reports/postProcess/extractCitations.ts:16`, and the UI prints chapter and verse unconditionally at `src/components/report/ScriptureFootnotes.tsx:47`.

- **Footer support email is missing.** v3 says footer must have working support email at `.launch-plan/plan_v3_opus_revised.md:55`, but it does not identify the current shared footer gap. The footer only links product/legal pages at `src/components/shared/Footer.tsx:12`.

- **Go/no-go content gate is too late.** Mon 04:00 leaves too little recovery time for a Mon 06:00 launch.

- **Health endpoint is a dependency gate, not just uptime.** v3 gives the response shape, but v4 should specify exactly which degraded states return 200 versus 503.

## Five Sharpest Disagreements

1. **I would not run v3's 20-concurrent report-start test as specified.** It conflicts with per-user rate limiting and would produce false failure or require risky test-only code.

2. **I would not make PostHog unconditional P0.** Privacy, consent, and PII controls must be done first. Sentry plus DB logs is enough for 06:00 if PostHog is not ready.

3. **I would not spend P0 time adding dashboard CTAs.** They already exist.

4. **I would not add an `approx_birth_time` persistence path before launch.** Clarify copy if needed; do schema/pipeline propagation post-launch.

5. **I would make citation extractor/rendering changes mandatory, not only manual audit.** The current UI and parser structurally assume verse numbers.

## v3 Rubric Score

| Dimension | Score | Reason |
|---|---:|---|
| 1. Feasibility in remaining window | 7 | Good cuts, but still sized for ~24h and adds too many files. |
| 2. Technical depth | 8 | Strong repo-aware plan, but missed rate-limit implications and current CTA/failure UI state. |
| 3. Sequencing | 7 | Right dependencies, but content gate too late and timeline not aligned to 12-18h. |
| 4. Testing rigour | 8 | Existing suite plus domain audit is good; burst test pass criteria wrong. |
| 5. Domain fidelity | 9 | Excellent emphasis on Lahiri, dasha, hora, Rahu Kaal, and citation truth. |
| 6. UX/design realism | 8 | Mostly avoids rebuilds, but repeats already-existing CTA work. |
| 7. i18n/market fit | 8 | English-first and Hindi waitlist are right; `messages/en.json` is harmless but not P0. |
| 8. Observability | 8 | Health, Sentry, PostHog, CSP are strong; privacy gating needs stricter sequencing. |
| 9. Risk management | 8 | Good risk register, cost caps, support runbook; too optimistic on execution. |
| 10. Autonomy | 8 | Clear lanes, but three approvals plus large scope reduce autonomy. |
| **Total** | **79/100** | Strong revised plan, but v4 needs to be smaller and stricter for the actual window. |

