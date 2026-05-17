# Launch Fixes — 2026-05-17

**Branch:** `claude/sad-mclean-e1c11d`
**Author:** Claude Opus 4.7 (with GPT-5.5 xhigh validation via Codex)
**Rollback tag:** `rollback-pre-launch-fixes-20260517` at commit `5032954`
**Final commit:** `50a58e2` (HEAD)

## What this branch does

Two commits sit between the rollback tag and HEAD. They apply the corrections
surfaced by a six-pass Opus 4.7 ⇄ GPT-5.5 xhigh validation loop documented in
`.launch-plan/`. Every change preserves existing behaviour where possible and
adds new launch-readiness surfaces where the audit demanded it.

## How to roll back if anything breaks

```bash
# From inside this worktree
git reset --hard rollback-pre-launch-fixes-20260517

# Or, if you've already merged to main and want to revert there:
git revert 2cfc845 50a58e2
```

That returns the worktree to commit `5032954` (the state when you handed it
to me). No DB migrations, no destructive changes, nothing in `.env*` modified.

## Commits

### `2cfc845` — Apply v6 critical launch fixes
Catches found by GPT-5.5 v4 (Hero fake stats, citation pattern lock, footer
support email) and GPT-5.5 v6 (pricing fake proof, refund email split-brain,
"Most Popular" → "Recommended").

**Code changes:**
- `src/lib/reports/postProcess/extractCitations.ts` — regex now accepts
  `[[SOURCE]]`, `[[SOURCE:CH]]`, and `[[SOURCE:CH:V]]`. `formatCitationLine`
  builds output conditionally.
- `src/components/report/ScriptureFootnotes.tsx` — render `Ch.` and `v.`
  only when those values are present; drop the "scholarly editions" footer.
- `src/components/landing/Hero.tsx` — remove fake `12,000+` and `★ 4.8`
  TRUST_STATS entries. Replace with provable facts (Swiss Ephemeris, Lahiri).
- `src/app/pricing/page.tsx` — remove "Chosen by 60% of our seekers" line.
  Badge `Most Popular` → `Recommended`.
- `src/components/landing/Pricing.tsx` — badge `Most Popular` → `Recommended`.
- `src/components/shared/Footer.tsx` — add visible `support@vedichour.com`.
- `src/app/refund/page.tsx` — callout email `hello@` → `support@`.
- `src/lib/agents/NativityAgent.ts` — prompt updated for three citation forms;
  "do not invent verse numbers" rule.
- `src/lib/agents/ForecastAgent.ts` — same citation guidance for gochara.

### `50a58e2` — Health endpoint, Hindi waitlist, tests, runbooks

**Code additions:**
- `src/app/api/health/route.ts` — public `/api/health` endpoint with explicit
  dep shape (Supabase / Ziina / Inngest / Upstash / Ephemeris / Anthropic /
  Sentry / PostHog). Returns 200 healthy, 200 degraded, or 503 unhealthy
  with explicit `blockers[]`. Never exposes secret values. Probes Supabase
  REST root + ephemeris `/health` with 2s timeout each.
- `src/components/landing/HindiWaitlist.tsx` — static landing section with
  mailto link. No backend dependency. Honours the "no `next-intl` routing"
  rule.
- `src/app/(marketing)/page.tsx` — insert `<HindiWaitlist />` between
  Pricing and FAQ.
- `src/__tests__/extractCitations.test.ts` — 13 new regression tests for
  the three citation forms (vitest count went 21 → 34).

**Operational documentation:**
- `docs/runbook/launch-day-support.md` — monitoring posture, 2h paid /
  8h free SLAs, five paste-ready standard responses, escalation triggers.
- `docs/runbook/refund-sop.md` — manual Ziina refund procedure.
- `docs/runbook/content-audit-checklist.md` — domain-correctness gate for
  Lahiri lagna, Vimshottari dasha, hora rotation, Rahu Kaal, citation
  truthfulness, and trust/safety. Run at the Sun 23:00 content gate.
- `docs/runbook/launch-go-no-go.md` — Mon 02:00 IST decision checklist
  with the v6 corrections baked in (correct burst-test acceptance, Ziina
  intent reuse semantics, bypass-E2E false-green warning, Upstash lock
  check, bypass-secret precondition).

## What is intentionally NOT in this branch

These are deferred to post-launch, per the v6 audit consensus:

- ❌ No refactor of `src/lib/reports/orchestrator.ts` (frozen).
- ❌ No refactor of `src/app/api/reports/start/route.ts` (frozen).
- ❌ No `next-intl` route restructuring. Hindi waitlist is a static section.
- ❌ No new Sentry / PostHog package installation. The `/api/health` endpoint
  reports their configured status, but adding the SDKs themselves requires
  `npm install` + CSP update + privacy-page update, which is a separate
  follow-up. The endpoint is ready to surface them once they ship.
- ❌ No admin refund route. Manual SOP in `docs/runbook/refund-sop.md`.
- ❌ No load test against report generation. The runbook describes the
  realistic burst test (`{202, 202, 202}` for 3 same-user starts, 429 on
  the 4th) but does not run it in CI.
- ❌ No new DB migrations.

## Tests run

| Check | Before | After | Status |
|---|---|---|---|
| `npm run typecheck` | 0 errors | 0 errors | ✓ |
| `npm run test` (vitest) | 21 passed | 34 passed | ✓ |
| `npm run lint` | clean | clean | ✓ |
| `npm run build:reliable` | succeeds | succeeds | ✓ |

Tests that were NOT run automatically (need a deploy + env vars):
- `npm run test:playwright` — Playwright matrix.
- `npm run test:e2e:bypass` — bypass E2E.
- `npm run rag:compare` — RAG comparison.
- Live `/api/health` probe against production.
- The full content audit per `docs/runbook/content-audit-checklist.md` —
  needs three real generated reports.

## Next steps for you (when you wake up)

1. **Pull this branch and inspect the diff** — `git diff 5032954..HEAD`.
2. **Run the launch go/no-go checklist** at `docs/runbook/launch-go-no-go.md`.
3. **Run the content audit** at `docs/runbook/content-audit-checklist.md`
   against three generated reports.
4. **Decide:** merge to `main` and launch at Mon 06:00 IST, or fall back to
   Mon 18:00 IST per the v6 audit's recommendation if any P0 gate is red.
5. **If everything looks good**: `git push origin claude/sad-mclean-e1c11d`
   then open a PR or merge directly.

## Where to read the full plan

Six artifacts in `.launch-plan/`:
- `plan_v1_opus.md` — Opus initial plan (67/100)
- `plan_v2_gpt55_own.md` + `plan_v2_gpt55_critique.md` — GPT-5.5 v2 (86/100)
- `plan_v3_opus_revised.md` — Opus revised (88/100, 79 per v4 audit)
- `plan_v4_gpt55_final.md` + `plan_v4_gpt55_critique_of_v3.md` — GPT-5.5 v4 (85/100)
- `plan_v5_consolidated.md` — Opus consolidated (89/100, 76 per v6 audit)
- `plan_v6_gpt55_redteam.md` — GPT-5.5 v6 red-team audit
- `comparison_dashboard.html` — interactive comparison dashboard
