# Plan v6 - GPT-5.5 Red-Team Audit of v5

## 1. Overall verdict on v5

v5 is the best-looking plan in the series, and that is exactly why it is dangerous: it reads decisive while still carrying bad acceptance tests, hero-only tunnel vision on fake proof, and hand-waved operational dependencies. It correctly preserves the big launch philosophy: freeze the report pipeline, patch citation truth in code, prove payment/report generation, add health/Sentry, keep PostHog conditional, and fall back to Mon 18:00 if gates are red. But it is not an 89/100 plan. It has enough wrong repo-level assertions and false-green gates that a launch-day post-mortem would not say "we lacked a plan"; it would say "the plan told us the wrong things were green."

## 2. Factual errors in v5

1. **LOC dispute: v5 mixes metrics and then says the wrong thing.** `Get-Content | Measure-Object -Line` returns 1992 and 631 because it is counting non-empty lines; `(Get-Content).Count`/EOF line numbers are 2129 and 678. v5's "1992/631" is correct for the requested command, but its phrase "actual EOF count is 1992" is false (`.launch-plan/plan_v5_consolidated.md:70`). EOF is visible at `src/lib/reports/orchestrator.ts:2129` and `src/app/api/reports/start/route.ts:678`. v4's 2129/678 was correct for EOF/citation line numbering (`.launch-plan/plan_v4_gpt55_final.md:55`).

2. **The report-start burst expectation is off by one.** v5 says three same-user starts should return `{202, 202, 429}` (`.launch-plan/plan_v5_consolidated.md:128`, `.launch-plan/plan_v5_consolidated.md:259`). The route limit is 3 per 60s (`src/app/api/reports/start/route.ts:35`) and the limiter allows `count <= limit` (`src/lib/api/rateLimit.ts:45`, `src/lib/api/rateLimit.ts:48`). The 429 should be on the fourth request, not the third; the 429 response is only used when `!rl.allowed` (`src/app/api/reports/start/route.ts:236`, `src/app/api/reports/start/route.ts:241`, `src/app/api/reports/start/route.ts:249`).

3. **The "5 distinct Ziina intent IDs" gate is underspecified and likely false if the same report is used.** v5 requires five sequential create-intents in 30s with five distinct IDs (`.launch-plan/plan_v5_consolidated.md:130`, `.launch-plan/plan_v5_consolidated.md:259`). The create-intent route deliberately reuses a pending intent for the same user/report/plan within 90s (`src/app/api/ziina/create-intent/route.ts:94`, `src/app/api/ziina/create-intent/route.ts:99`, `src/app/api/ziina/create-intent/route.ts:101`, `src/app/api/ziina/create-intent/route.ts:112`, `src/app/api/ziina/create-intent/route.ts:120`). The test must use five distinct report IDs or expect reuse.

4. **v5 leans on an E2E spec that can pass on report failure.** v5 says the paid/bypass report is watched via `e2e/report-generation-bypass.spec.ts:32` and that `status=error` is not a launch pass (`.launch-plan/plan_v5_consolidated.md:100`). But the spec itself returns successfully when status is `error` as long as `generation_error` is non-empty (`e2e/report-generation-bypass.spec.ts:72`, `e2e/report-generation-bypass.spec.ts:77`, `e2e/report-generation-bypass.spec.ts:78`). Running `npm run test:e2e:bypass` green is not enough for v5's own launch definition.

5. **v5 says it found the fake proof, but it did not sweep the site.** It only names Hero `TRUST_STATS` (`.launch-plan/plan_v5_consolidated.md:88`, `.launch-plan/plan_v5_consolidated.md:89`). The pricing page still hard-codes "Chosen by 60% of our seekers" (`src/app/pricing/page.tsx:166`) and "Most Popular" as a popularity claim (`src/app/pricing/page.tsx:63`). The landing pricing component also renders "Most Popular" (`src/components/landing/Pricing.tsx:143`). If "no fake proof" is P0, v5's acceptance criterion is too narrow.

6. **v5 under-describes the Upstash fallback.** It says absent Upstash means rate-limit fallback only (`.launch-plan/plan_v5_consolidated.md:139`). In this repo, Upstash absence also makes report generation locks local process memory: `getRedis()` returns null without env vars (`src/lib/redis/client.ts:8`, `src/lib/redis/client.ts:10`, `src/lib/redis/client.ts:12`), and locks fall back to `localLocks` (`src/lib/redis/locks.ts:3`, `src/lib/redis/locks.ts:12`, `src/lib/redis/locks.ts:19`, `src/lib/redis/locks.ts:22`). That is more than a rate-limit nuisance.

7. **The Inngest concurrency cap is not the cap v5 implies.** v5 uses "Inngest concurrency cap" as a cost/backlog mitigation (`.launch-plan/plan_v5_consolidated.md:136`, `.launch-plan/plan_v5_consolidated.md:223`). The repo function has per-report duplicate protection only: `key: 'event.data.reportId'`, `limit: 1` (`src/lib/inngest/functions.ts:106`, `src/lib/inngest/functions.ts:109`, `src/lib/inngest/functions.ts:111`). A global/account concurrency cap may exist in the Inngest dashboard, but that is [unverified].

## 3. Items v5 still misses

- **Site-wide fake proof cleanup.** Hero is not the whole problem. The pricing page's "Chosen by 60% of our seekers" is exactly the same class of unsupported claim as the hero counter (`src/app/pricing/page.tsx:166`). "Most Popular" is softer but still implies usage data (`src/app/pricing/page.tsx:63`, `src/components/landing/Pricing.tsx:143`).

- **Refund/support contact consistency.** v5 adds support email to the shared footer, good. It misses that the refund guarantee callout tells users to email `hello@vedichour.com` (`src/app/refund/page.tsx:63`, `src/app/refund/page.tsx:64`) while the refund CTA uses `support@vedichour.com` (`src/app/refund/page.tsx:81`). That is a launch-day support split-brain.

- **A hard shared-lock verification.** v5 asks to confirm Upstash, but it does not explicitly test that report locks are using Redis rather than local memory. The lock code falls back locally (`src/lib/redis/locks.ts:19`, `src/lib/redis/locks.ts:22`), and successful starts dispatch `report/generate` events (`src/app/api/reports/start/route.ts:529`, `src/app/api/reports/start/route.ts:533`), so a "first paid user double-clicked" incident can become duplicate generation work and wasted LLM spend.

- **Bypass availability as a production smoke prerequisite.** v5 schedules a production bypass report (`.launch-plan/plan_v5_consolidated.md:187`), but bypass is disabled when `BYPASS_SECRET` is unset (`src/lib/api/requireAuth.ts:8`, `src/lib/api/requireAuth.ts:16`, `src/lib/api/requireAuth.ts:40`, `src/lib/api/requireAuth.ts:42`). The env verifier only warns about missing bypass (`scripts/verify-report-generation-env.mjs:82`, `scripts/verify-report-generation-env.mjs:83`).

## 4. Items v5 over-engineers

- **PostHog still consumes too much planning surface.** v5 makes it conditional, which is correct, but the timeline still carries a 15:00 PostHog readiness decision (`.launch-plan/plan_v5_consolidated.md:178`) while privacy text is scheduled later at 22:00 (`.launch-plan/plan_v5_consolidated.md:184`). For 06:00, Sentry plus DB traces is the launch path; PostHog is Monday 18:00 unless already done.

- **The health/load ceremony is too cute where the acceptance tests are wrong.** A 50 RPS health probe is cheap (`.launch-plan/plan_v5_consolidated.md:129`), but v5 spends attention on that while shipping an off-by-one limiter test and an invalid Ziina distinct-ID expectation.

- **"Support macros" as P0 is fine only if it does not block code-truth fixes.** The runbook is useful, but fake proof and refund-email inconsistency are actual user-facing defects; macro polish is [unverified] external work.

## 5. Hidden risk v5 mentions but under-weights

**Upstash absence.** v5 rates it Medium and frames it as rate-limit fallback (`.launch-plan/plan_v5_consolidated.md:220`). Wrong severity. Upstash gates both rate limits and locks: rate limits fall back to a process-local `Map` (`src/lib/api/rateLimit.ts:15`, `src/lib/api/rateLimit.ts:54`, `src/lib/api/rateLimit.ts:73`), and report locks fall back to `localLocks` (`src/lib/redis/locks.ts:3`, `src/lib/redis/locks.ts:19`, `src/lib/redis/locks.ts:22`). In serverless production, local memory is not a shared safety mechanism. This is the one most likely to bite because it can turn a launch spike into duplicate generation, unreliable throttling, and noisy support.

## 6. Five most likely failure modes on launch day

1. **Fake proof survives outside Hero.** v5 section 3.5 only gates Hero/footer (`.launch-plan/plan_v5_consolidated.md:88`, `.launch-plan/plan_v5_consolidated.md:90`), while pricing still claims "Chosen by 60%" (`src/app/pricing/page.tsx:166`).

2. **QA falsely fails the burst gate and wastes the recovery window.** v5 section 3.9 expects the third same-user start to 429 (`.launch-plan/plan_v5_consolidated.md:128`), but the limiter allows three (`src/app/api/reports/start/route.ts:35`, `src/lib/api/rateLimit.ts:48`).

3. **Payment burst test falsely fails or tests the wrong behavior.** v5 section 3.9 wants five distinct Ziina intents (`.launch-plan/plan_v5_consolidated.md:130`), but same-report pending intent reuse is intentional (`src/app/api/ziina/create-intent/route.ts:94`, `src/app/api/ziina/create-intent/route.ts:112`).

4. **Report E2E is green while paid generation actually errored.** v5 section 3.8 includes `npm run test:e2e:bypass` (`.launch-plan/plan_v5_consolidated.md:120`), but the spec accepts `status=error` with a non-empty diagnostic (`e2e/report-generation-bypass.spec.ts:72`, `e2e/report-generation-bypass.spec.ts:78`).

5. **Shared lock is absent in production.** v5 section 3.10 says confirm Upstash (`.launch-plan/plan_v5_consolidated.md:139`), but does not test Redis-backed locking; local lock fallback is in the repo (`src/lib/redis/locks.ts:19`, `src/lib/redis/locks.ts:22`).

## 7. Sequencing problems

- Privacy/PostHog ordering is internally inconsistent: PostHog readiness is decided at 15:00 (`.launch-plan/plan_v5_consolidated.md:178`), but privacy text is scheduled 22:00-23:00 (`.launch-plan/plan_v5_consolidated.md:184`).

- Content approval happens before production deploy and production bypass smoke (`.launch-plan/plan_v5_consolidated.md:185`, `.launch-plan/plan_v5_consolidated.md:187`). That is acceptable only if staging and production envs are identical [unverified].

- Production bypass smoke assumes `BYPASS_SECRET` exists, but the auth layer disables bypass without it (`src/lib/api/requireAuth.ts:8`, `src/lib/api/requireAuth.ts:16`), and the env verifier treats missing bypass as a warning (`scripts/verify-report-generation-env.mjs:82`, `scripts/verify-report-generation-env.mjs:83`).

## 8. Self-attribution check

v5 gives v4 plenty of credit, mostly fairly. v4 did catch the hero stats, citation parser/UI, footer support gap, content-gate timing, dashboard CTA redundancy, and the bad 20-concurrent burst premise (`.launch-plan/plan_v5_consolidated.md:34`, `.launch-plan/plan_v5_consolidated.md:36`, `.launch-plan/plan_v5_consolidated.md:37`, `.launch-plan/plan_v5_consolidated.md:51`, `.launch-plan/plan_v5_consolidated.md:53`). The unfair part is that v5 attributes the exact "3 same-user gets 202,202,429" correction to v4 even though v4 only said to prove limiter behavior; v5 invented the wrong expected result (`.launch-plan/plan_v4_gpt55_final.md:14`, `.launch-plan/plan_v5_consolidated.md:128`). It also undercounts v2's continuing influence: the "no fake proof" principle was v2, and v5 still failed to apply it site-wide.

## 9. Score v5 on the 10-dim rubric

| Dimension | Score | Justification |
|---|---:|---|
| Feasibility | 8 | Scope is mostly sane, but Sentry/health/privacy/load/content in 18h leaves little room for the bugs v5's own tests will create. |
| Technical depth | 7 | Strong file awareness, damaged by wrong LOC wording, wrong limiter expectation, and missed pricing fake proof. |
| Sequencing | 7 | Citation/content timing is good; PostHog/privacy and content-before-prod-smoke are weak. |
| Testing rigour | 6 | Existing suite plus smoke is good, but three acceptance gates are factually wrong or false-green. |
| Domain fidelity | 9 | Citation truth, Lahiri, lagna, hora, dasha, Choghadiya, and Rahu Kaal are properly launch-critical. |
| UX/design realism | 8 | Minimal UI scope is right, but support/refund contact inconsistency and pricing fake proof remain. |
| i18n/market fit | 8 | English-first and static Hindi only is right; PostHog/DPDP chatter can wait if not done. |
| Observability | 8 | Health/Sentry/DB traces are right, but no Sentry package appears in the dependency blocks today (`package.json:29`, `package.json:55`, `package.json:57`, `package.json:69`). |
| Risk management | 7 | Fallback is good; Upstash and false-green E2E are underweighted. |
| Autonomy | 8 | Two human gates are workable, but several "objective" gates are not objective until corrected. |
| **Total** | **76/100** | Good strategy, sloppy acceptance. |

## 10. Final verdict: launch Mon 06:00 or fall back to Mon 18:00?

**Fall back to Mon 18:00 as v5 is written.** Mon 06:00 is still possible only if v5 is patched immediately: fix the burst expectations, make Ziina intent testing use distinct report IDs, do not count bypass E2E green as report success, sweep fake proof across pricing/landing, fix refund/support email consistency, and verify Redis-backed rate limit plus lock behavior.

## 11. If I could change ONE thing about v5

Replace the narrative acceptance table with a repo-faithful launch checklist that has exact expected outcomes. The plan's strategy is fine; the dangerous part is that its green lights are lying.
