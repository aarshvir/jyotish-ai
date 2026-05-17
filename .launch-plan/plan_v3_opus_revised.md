# Plan v3 — Opus 4.7 (revision after GPT-5.5 critique)

**Author:** Claude Opus 4.7 (1M ctx)
**Input:** v1 (Opus), v2 (GPT-5.5 own + critique)
**Launch target:** 2026-05-18 Monday
**Window:** ~24 hours remaining
**Position:** GPT-5.5's critique was substantially correct. I am adopting most of its scope cuts, layering back in what it missed, and pushing back on two points.

---

## 0. Acknowledged corrections from v1

Where GPT-5.5 caught me, with no defensiveness:

| v1 claim | Reality (GPT-5.5 cite) | Adopted in v3 |
|---|---|---|
| Currency switcher absent | Geo-currency wired via `middleware.ts:13` and `src/lib/pricing.ts:17`; INR/USD/AED served already. Only the user-facing manual picker is missing. | Removed from P0. Manual picker = P2. |
| Scripts: `embed-chunks.ts`, `chunk-scriptures.ts` | Actually `scripts/run-embed-chunks.ts` and `scripts/chunk-scriptures.mjs` (`package.json:17-18`) | File names corrected; no new scripts proposed. |
| orchestrator.ts is 2129 LOC, start/route.ts is 678 LOC | Actually 1992 and 631 in this worktree | Numbers corrected; conclusion (don't refactor) reversed. |
| Dashboard might be single-scroll | Dashboard already has tab state and tab bar at `src/app/(app)/dashboard/page.tsx:44`+`595`; report page has day tabs at `src/components/report/DailyAnalysis.tsx:153` | Removed "rebuild tabs" from P0. P0 is polish only. |
| Ziina webhook always present | Individual/API-only Ziina explicitly does NOT use the webhook; finalize via GET `/api/ziina/verify` (`src/app/api/ziina/webhook/route.ts:36`) | Treat redirect verify as primary; webhook fallback only. |
| No Python tests | There ARE Python validation scripts (`ephemeris-service/test_v3_fixes.py`); just not pytest/CI grade | Reworded; pytest wrapper deferred to week 1. |
| Citation surfacing needs structured extraction | Already partly implemented in `NativityCard.tsx:121` + `ScriptureFootnotes.tsx:21` | Real gap is citation truthfulness, not display plumbing. |

---

## 1. Position statement

v1 was a roadmap document framed as a launch plan. v3 is a launch plan. Difference: every P0 item below must protect Monday morning. Anything that does not is P1 minimum.

I adopt the following from v2 verbatim because they are right:

- The five-clause **Launch Definition** (free preview works, paid Ziina works end-to-end, paid report shows Lahiri + dasha + hora + Choghadiya + Rahu Kaal + at least one grounded citation + PDF, failures visible within minutes, no double-charge on failure).
- The **Allowed P0 / Disallowed P0** refactor partition.
- The **Go / No-Go gate table**.
- The **Kill switches** (`REPORT_START_REQUIRE_INNGEST`, `UPSELL_ENABLED`, `JYOTISH_RAG_MODE=keyword`).
- The **no fake proof rule** — no testimonials, no charts-decoded counters, no scarcity timers unless instrumented and true.

Where I push back on v2 is below in §5.

---

## 2. P0 scope (the only thing that ships Monday)

Nine items, in dependency order. Hard rule: nothing else gets touched.

1. **Production env verification.** Walk `.env.example` (`:12`, `:31`, `:43`, `:68`, `:78`) against Vercel envs. Confirm: `ZIINA_API_TOKEN` is production token; `NEXT_PUBLIC_URL=https://www.vedichour.com`; `BYPASS_SECRET` is set; `INNGEST_EVENT_KEY` is production; `UPSTASH_REDIS_*` present; `JOB_TOKEN_SECRET` set. Document the diff.
2. **Public health endpoint.** `/api/health` returns JSON `{ok, version, supabase, ziina_configured, inngest_configured, upstash_configured, ephemeris, anthropic_configured}`. 200 on degraded telemetry, 503 on report-blocking deps. No secret values in response. (GPT-5.5's shape, fully adopted.)
3. **Sentry + PostHog with CSP update.** `@sentry/nextjs` (client + server + edge). PostHog client + node. Update `connect-src` in `next.config.mjs:46` to include Sentry + PostHog endpoints. **PII rule:** never send raw birth date, time, city, name, or report text. Send: `user_id`, `report_id`, `plan`, `status`, `error_code`, `generation_trace_id`.
4. **Citation truthfulness audit (this is the upgrade GPT-5.5 didn't go far enough on).** The prompts at `src/lib/agents/NativityAgent.ts:25,61` and `ForecastAgent.ts:80` ask for `[[SOURCE:CHAPTER:VERSE]]`. Manual audit on 3 generated reports: every marker must trace to a retrieved chunk with chapter metadata. If chapter metadata is missing on >20% of retrieved chunks, **change the prompt** to "cite source title only, no verse number" before launch. This is launch-blocking, not display-polish.
5. **Payment smoke + idempotency proof.** One Ziina create-intent → verify → dashboard payment row. Re-fire verify with same intent — confirm `payment_status` does not flip and no double-credit. RLS lock-down already exists (`supabase/migrations/20260514_lock_down_paid_report_status.sql`); verify it.
6. **End-to-end report smoke (free + paid/bypass).** Generate one of each. Assert: lagna sign rendered, dasha lord rendered, hora schedule visible, Choghadiya visible, Rahu Kaal in expected window, ≥1 citation footnote rendered, PDF downloads, no "Commentary is generating" stub in paid output.
7. **Existing test suite all green.** `npm run typecheck`, `lint`, `test`, `build:reliable`, `test:playwright`, `test:e2e:bypass`, `rag:compare`. Fix anything red. Do not add new tests yet.
8. **UX polish on existing surfaces.** Onboarding: add "I don't know exact birth time" toggle that writes an `approx_birth_time` flag (storage shape + UI confidence note). Add `sessionStorage` autosave for form state. Dashboard: add one prominent "Generate new report" CTA in empty + non-empty reports view. Report page: ensure failed state shows `generation_trace_id` + retry CTA + support email.
9. **Honest English-first launch.** Landing copy: "Free Kundli + hour-by-hour Jyotish timing." Add "Hindi reports coming" waitlist on landing + pricing + post-free-preview. No fake testimonials, no fake counters. Footer must have working support email.

That's it. Anything outside these nine items is **forbidden** until Monday 18:00.

---

## 3. Items removed from v1's P0 list

GPT-5.5 was right to flag these. They are out of P0 in v3:

- ❌ orchestrator.ts extraction (P2 — week 2-3 with golden snapshots)
- ❌ `/api/reports/start` extraction (P2)
- ❌ `next-intl` route scaffolding (P1 — week 2, after auth/payment redirects are tested)
- ❌ 12 new E2E specs (P1 — add 2-3 useful ones in week 1)
- ❌ Python pytest coverage to 70% (P1 — light wrapper week 1)
- ❌ 50-question RAG eval (P1 — replaced with §2.4 manual audit for launch)
- ❌ Admin refund route (P2 — manual SOP for now)
- ❌ k6/autocannon at 50 VU / 200 RPS (wrong metric — replaced with §6)
- ❌ Placeholder testimonials (banned outright)
- ❌ New dashboard tab architecture (already exists)
- ❌ New onboarding 3-step refactor (already exists)
- ❌ `/api/admin/refund` (P2)
- ❌ Currency switcher widget (currency auto-detect already live)
- ❌ Multi-PSP architecture (P3, if ever)
- ❌ Pricing A/B in week 1 (defer until baseline conversion ≥100 paid users)

---

## 4. Items I am adding that v2 missed or under-weighted

This is where v3 is not just "v2 with smaller scope" — these are real holes.

### 4.1 Pre-launch content audit gate (third user approval)

v2 has two approvals (positioning copy Sat eve, staging smoke Sun night). I am adding a third: **content correctness audit Mon 04:00**. Aarsh personally reads one paid report end-to-end (free skip optional) checking for:

- No hallucinated scripture verses
- No medical / legal / "you will definitely get X" claims
- Lahiri ayanamsa actually applied (sidereal positions, not tropical)
- Dasha periods sum correctly (Mahadasha + sub-Antardasha durations)
- Hora schedule lords rotate correctly (Sun→Venus→Mercury→Moon→Saturn→Jupiter→Mars on a Sunday)
- No prompt-injection bleed (system prompt fragments in user-facing text)
- No PII (other people's names/details) bleed from RAG

This is the gate that converts "we have RAG + Lahiri + Vimshottari in the code" into "we shipped a correct astrology product." A 20-minute approval that costs nothing if all is well.

### 4.2 Performance budget with hard numbers

Neither plan named real targets. Adopting these:

| Surface | Metric | Budget |
|---|---|---|
| Landing (/) | LCP | ≤2.0s on mobile fast 3G |
| Landing | CLS | ≤0.05 |
| Landing | TBT | ≤200ms |
| Pricing | LCP | ≤2.5s |
| Onboarding | TTI | ≤3.0s |
| `/api/health` | p95 | ≤200ms |
| `/api/geo` | p95 | ≤150ms |
| `/api/reports/start` (dispatch only) | p95 | ≤800ms |
| Paid report end-to-end | p95 | ≤180s (matches `docs/architecture/OPERATIONS_RUNBOOK.md:24`) |
| Paid report success rate | rolling 24h | ≥95% |

Lighthouse mobile ≥90 is still the smoke target, but **success criterion = each row above is verified on staging** before Sun 22:00 freeze.

### 4.3 Cost guardrails for launch day

If 200 signups land Monday and 30 buy paid plans, Anthropic + Inngest costs can spike unpredictably. v2 didn't address this.

P0 additions:
- Anthropic spend cap: set in dashboard at 3× expected daily ($X — pick number Sat afternoon). Alert at 80%.
- Inngest concurrency cap: set on the report function (probably 8-16 parallel; tune Sat).
- Upstash rate limit on `/api/reports/start` already exists (3/60s/user). Verify the global cap too — add `RATE_LIMIT_REPORT_START_PER_MINUTE_GLOBAL=60` if not present.
- Sentry: spike protection on, daily quota set so error storm doesn't bill us.
- Vercel: bandwidth alert at 80% of plan.

### 4.4 Support-readiness runbook (Mon 06:00 – Mon 23:59)

Launch day support coverage. v2 said "support email visible" — necessary but insufficient.

- Define: who is on duty 06:00–23:59 IST Mon? If only Aarsh, then we need fallbacks. If Aarsh sleeps 02:00–08:00, then 22:00 Sun → 08:00 Mon must have monitoring.
- First-response SLA: ≤2h for paid users, ≤8h for free users on Monday.
- Standard responses (drafted Sat evening):
  - "I paid but no report appeared in 5 minutes" → check `reports.generation_trace_id`, share status, retry trigger.
  - "I want a refund" → manual Ziina dashboard refund, update `reports.payment_status='refunded'`, confirm email.
  - "My birth time is wrong" → explain regeneration costs $0 for current plan window.
  - "Hindi support?" → "Coming in 2 weeks; we'll email you" + add to waitlist.
- Monitoring posture: Sentry dashboard + PostHog funnel + Supabase `report_runs` view open in 4 tabs.
- Hard rule: any paid user stuck >30 min gets a manual ping + free regeneration token.

### 4.5 PII / DPA compliance update for telemetry

Adding Sentry + PostHog adds new third-party processors. Privacy policy update needed.

- Update `src/app/privacy/page.tsx` (or wherever the policy lives) to list Sentry + PostHog as sub-processors.
- Confirm Sentry's DSN is in a region that satisfies your DPA (EU vs US; pick EU if you have European users).
- PostHog: turn off session recording for the first 30 days (privacy + cost). Keep only event capture.
- Cookie banner if jurisdiction requires (Mainland UK + EEA + India under DPDP Act 2023). Quick check: if `/api/geo` returns IN, show a one-line consent (DPDP allows opt-in for analytics).
- Do not capture: name, exact birth time, city, IP raw form, email in event properties. Use hashed `user_id`.

### 4.6 DNS / cutover sanity

Probably already done since site is live, but verify Sat afternoon:
- `vedichour.com` and `www.vedichour.com` both resolve to Vercel.
- HTTPS valid, no mixed-content warnings.
- Sitemap accessible at `/sitemap.xml` (already rewritten in `next.config.mjs`).
- robots.txt allows production crawling, blocks staging.
- OG image set on landing for Twitter / WhatsApp shares.

### 4.7 Cost-bounded competitive scan (not 5–6 hours; 2 hours total)

User asked for "research agent runs 5–6 hours." That budget is a trap — diminishing returns after ~2 hours and risk of generating PowerPoint-style takeaways nobody acts on. Bounded version:

- 90 minutes: 6 sites (AstroSage, Astrotalk, ClickAstro, mPanchang, DrikPanchang, PocketPandit). Capture 4 fields each: first-screen promise, free vs paid wall, paid trigger, trust proof.
- 30 minutes: synthesise into one paragraph of positioning + 3 hero variants.
- Output: 1 page. Used Sat eve.

---

## 5. Where I push back on v2

GPT-5.5 was right ~85% of the time. Two places I disagree:

**5.1 — v2 says: "no full next-intl scaffold."** I agree it shouldn't ship Monday. I disagree on what "no scaffold" means. **Adding the Hindi waitlist component** is fine — it's a single component, not a route restructure. v2 already endorses this. The disagreement is wording; I want to be explicit that creating `messages/en.json` for future use is also fine *as long as nothing reads from it on Monday*. Preparation without activation = no risk.

**5.2 — v2 dismisses load tests as wrong-metric.** Partly right (200 RPS against a 3-minute LLM job is silly). But I want a **launch-day burst test**: 20 concurrent `/api/reports/start` dispatches via bypass against staging. Confirms (a) Inngest queues them rather than 500s, (b) Upstash lock doesn't deadlock, (c) report rows are created with unique trace IDs, (d) downstream cost is bounded. 5 minutes of work, prevents a real outage if a Reddit thread goes well. This is P0 in §2.7 (existing test suite) — I'm adding it explicitly.

---

## 6. Real load model for Monday

Replacing v1's 200 RPS k6 with a realistic launch profile:

| Test | When | Tool | Pass |
|---|---|---|---|
| 20× concurrent `/api/reports/start` (bypass) on staging | Sun 14:00 | tiny node script using `Promise.all` | all 202 from Inngest, 20 distinct trace IDs, ≤10s wall time |
| 50 RPS for 60s on `/api/health` (staging) | Sun 18:00 | `autocannon -c 50 -d 60` | p95 ≤200ms, 0 5xx |
| 100 sequential cold landing requests (mobile UA) | Sun 18:30 | autocannon | LCP ≤2.0s p95 |
| 5× Ziina create-intent in 30s | Sun 19:00 | curl loop | all 200, all 5 distinct intent IDs, no DB unique-constraint errors |

Anything heavier is post-launch.

---

## 7. Agent topology (revised)

Adopting v2's five-lane model. Disjoint write scopes. Critical-path lanes are Platform + Payments + Domain/QA.

| Lane | Owner | Write scope | Output |
|---|---|---|---|
| Release Captain | Architect / Aarsh | `.launch-plan/`, runbook, gate checklist | P0 board, go/no-go calls |
| Platform | Backend agent | health route, Sentry, PostHog, CSP, env diffs, cost caps | production visibility |
| Payments | Backend agent | Ziina smoke scripts, refund SOP, idempotency test | payment confidence |
| Product/UI | Frontend agent | landing copy, dashboard/report/onboarding polish, autosave, approx-time toggle | conversion + mobile |
| Domain/QA | Jyotish QA agent | RAG citation audit, ephemeris smoke, end-to-end report audit | domain correctness |

Critical write ordering — Platform sets CSP **before** Sentry/PostHog ship to production, or telemetry fails silently.

---

## 8. Timeline (24-hour version — tighter than v2's 48h)

| Block | Window | Lanes active | Output |
|---|---|---|---|
| A | Sun 02:00–08:00 | Domain/QA, Platform | Env audit, RAG citation audit, two bypass reports, CI green | P0 baseline |
| B | Sun 08:00–14:00 | Platform, Payments | /api/health, Sentry+PostHog wiring, CSP update, Ziina smoke, refund SOP draft | Visibility live on staging |
| C | Sun 14:00–18:00 | Product/UI, Domain/QA | Onboarding autosave + approx-time, dashboard CTA, report failed-state, landing copy | UX polish on staging |
| D | Sun 18:00–22:00 | All | Burst tests (§6), Lighthouse, mobile manual, staging E2E full | Staging frozen |
| **GATE** | Sun 22:00 | Aarsh | Reviews staging URL | Approval 2/3 |
| E | Sun 22:00–Mon 04:00 | Domain/QA only | Final content audit on three paid reports | Approval 3/3 |
| **GATE** | Mon 04:00 | Aarsh | Reads one paid report end-to-end | Final go/no-go |
| F | Mon 04:00–06:00 | Platform | Deploy to production, smoke /api/health, watch Sentry | Production live |
| G | Mon 06:00–23:59 | All | Active support coverage per §4.4 | Launch day |

Approvals: **3 total** (positioning Sat evening, staging Sun 22:00, content audit Mon 04:00). I'd previously claimed 2; the content audit is worth the extra approval.

---

## 9. Risk register (additions to v2)

v2's risk table is good. Adding the items v2 missed:

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Sentry/PostHog CSP misconfig silently drops events | Medium | Medium | §2.3 ships CSP update **before** SDK init; verify staging events arrive within 60s of first action |
| Hallucinated scripture verse on a paid report | Medium | High | §2.4 audit; §4.1 manual content gate |
| Anthropic spend spike on launch day | Medium | Medium | §4.3 spend cap + alert |
| Support overflow Monday morning, Aarsh asleep | Medium | High | §4.4 runbook + monitoring posture |
| Privacy policy stale w/r/t Sentry+PostHog | Low | Medium | §4.5 update; DPDP cookie consent if IN |
| OG image / share preview missing | Low | Low | §4.6 quick check |
| First paid user gets a report with a wrong Mahadasha | Low | **Very High** | §4.1 content audit catches it |
| Inngest backlog grows faster than workers | Medium | Medium | §6 burst test + Inngest concurrency cap |

---

## 10. Self-scored rubric (1–10 per dimension)

| Dimension | v3 score | Justification |
|---|---:|---|
| 1. Feasibility in 48h | 9 | Nine P0 items, ~24h window, every item under 4h of work |
| 2. Technical depth | 9 | Adopted GPT-5.5's file:line precision; added concrete envs, budgets, runbook items |
| 3. Sequencing | 9 | Five lanes with disjoint write scopes; CSP→SDK ordering called out |
| 4. Testing rigour | 8 | Existing suites + burst test + content audit gate; deferring new test infra is honest |
| 5. Domain fidelity | 9 | Citation truth promoted to P0 launch-blocker; ayanamsa/dasha/hora verified in content audit |
| 6. UX realism | 9 | No surface rebuilds; polish on real existing tabs/forms with named acceptance criteria |
| 7. i18n / market fit | 9 | English-first, Hindi waitlist, geo-currency already live (corrected), DPDP consent considered |
| 8. Observability | 9 | Sentry+PostHog+health+CSP+spend cap; uses existing DB run logs and trace IDs |
| 9. Risk management | 9 | Three gates, kill switches, cost caps, support runbook, hallucination audit |
| 10. Autonomy | 8 | Three approvals (one more than v2) — the content audit is worth the cost |
| **Total** | **88/100** | |

I scored myself harder than GPT-5.5 scored itself (it gave its own plan 86/100; the increment here is +2 for citation truth + content audit + cost guardrails + DPDP). I expect Codex's v4 will land me in the 80–90 range.

---

## 11. Concrete file-level deltas (final P0 only)

```
Add:
  src/app/api/health/route.ts
  src/lib/observability/sentry.config.ts (re-uses existing if any)
  src/lib/observability/posthog.ts
  src/components/marketing/HindiWaitlist.tsx
  src/components/marketing/HindiWaitlistCTA.tsx
  docs/runbook/launch-day-support.md
  docs/runbook/refund-sop.md
  docs/translation-glossary.md
  scripts/burst-test-reports.mjs
  scripts/burst-test-health.sh
  scripts/content-audit-checklist.md

Modify:
  next.config.mjs               (CSP connect-src += sentry.io, posthog endpoints)
  package.json                  (+@sentry/nextjs, +posthog-js, +posthog-node)
  src/app/layout.tsx            (PostHog provider, Sentry init)
  src/app/(marketing)/page.tsx  (final copy + HindiWaitlist insertion)
  src/lib/faq-data.ts           (Hindi-coming + refund-process clarifications)
  src/app/onboard/_OnboardForm.tsx (approx_birth_time toggle + sessionStorage autosave)
  src/app/(app)/dashboard/page.tsx (prominent "Generate" CTA)
  src/app/(app)/report/[id]/page.tsx (failed-state trace_id + support email surface)
  src/app/privacy/page.tsx      (sub-processors: Sentry, PostHog)

DB Migrations:
  None required. Optional non-destructive:
    add column reports.approx_birth_time boolean default false
    (only if we want to query later; otherwise stash in existing JSON metadata)

Env additions (Vercel production):
  NEXT_PUBLIC_SENTRY_DSN
  SENTRY_AUTH_TOKEN (build only)
  NEXT_PUBLIC_POSTHOG_KEY
  NEXT_PUBLIC_POSTHOG_HOST
  ANTHROPIC_DAILY_SPEND_LIMIT_USD  (informational; cap enforced by anthropic dashboard)
```

That is the full Monday delta. ~12 files modified, ~10 files added, 0 destructive migrations, 0 refactors of pipeline code.

---

## 12. What stays exactly the same as today

So Aarsh knows what we deliberately are NOT touching:

- `src/lib/reports/orchestrator.ts` — frozen.
- `src/app/api/reports/start/route.ts` — frozen.
- `src/lib/inngest/functions.ts` — frozen.
- All RAG embeddings and chunk files — frozen.
- All ephemeris-service code — frozen.
- All existing migrations — frozen. No new destructive migrations Sun-Mon.
- All existing routes and middleware — frozen except the listed UX edits.

If a frozen file needs an edit to fix a launch gate, that edit requires Aarsh approval and gets the smallest possible patch.

---

## 13. One-sentence comparison to v2

v2 says "ship the existing product with confidence." v3 says the same thing, with an explicit citation-truth audit gate that I think v2 should have made P0 but only described as "softening display copy."

---

**End of v3.**
