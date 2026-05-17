# Launch Go / No-Go Checklist

**Target:** Mon 2026-05-18 06:00 IST
**Fallback:** Mon 2026-05-18 18:00 IST if any P0 gate red at Mon 02:00 IST
**Source:** v5 §8 with v6 corrections applied

## Use this checklist at Mon 02:00 IST

### GO conditions — all must be true

#### Environment
- [ ] `node scripts/verify-report-generation-env.mjs` exits 0 against prod env.
- [ ] `NEXT_PUBLIC_URL=https://www.vedichour.com` in Vercel prod.
- [ ] `ZIINA_API_TOKEN` set (production token, not test).
- [ ] `INNGEST_EVENT_KEY` set; `REPORT_START_REQUIRE_INNGEST=true`.
- [ ] `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` set.
- [ ] `ANTHROPIC_API_KEY` set.
- [ ] `JOB_TOKEN_SECRET` set.
- [ ] `BYPASS_SECRET` set (per v6 — without this, bypass smoke silently no-ops).

#### Health endpoint (the one we just shipped)
- [ ] `https://www.vedichour.com/api/health` returns `200 + status: "healthy"`.
- [ ] `body.blockers` array is empty.
- [ ] `body.deps.supabase.reachable === true`.
- [ ] `body.deps.ephemeris.reachable === true`.
- [ ] Sentry test exception captured in Sentry dashboard within 30 seconds.

#### Shared locks (per v6 — critical, easy to miss)
- [ ] Verify `body.deps.upstash.configured === true` AND `body.deps.upstash.required === true`.
- [ ] Manually verify Redis-backed locking works:
  ```bash
  curl -X POST .../api/reports/start with auth, then immediately again with same payload
  ```
  Second call must return `503` or `409` (lock held), NOT `202` (which would
  indicate local-memory lock fallback in serverless = no lock at all).

#### Tests
- [ ] `npm run typecheck` clean.
- [ ] `npm run lint` clean.
- [ ] `npm run test` all green (now includes new `extractCitations.test.ts`).
- [ ] `npm run build:reliable` succeeds.
- [ ] `npm run rag:compare` exits 0 or with documented acceptable variance.

#### Payment smoke
- [ ] One Ziina create-intent → verify → `reports.payment_status='paid'` row.
- [ ] Duplicate `/api/ziina/verify` call returns idempotent result (no
      double-finalize, no double-dispatch).
- [ ] RLS prevents client-side write to `payment_status='paid'`.

#### Report smoke (the one that actually matters)
- [ ] One paid/bypass 7-day report completes successfully.
- [ ] `status='completed'` AND `days` array non-empty.
  - **Per v6:** do NOT count `status='error'` with non-empty `generation_error`
    as a pass. The Playwright bypass spec accepts that as green; this checklist does not.
- [ ] Lahiri lagna visible in nativity section.
- [ ] Current Vimshottari Mahadasha/Antardasha visible.
- [ ] Hora + Choghadiya + Rahu Kaal sections present and non-empty.
- [ ] At least one scripture citation footnote rendered (source-only is fine
      per the v6 citation patch).
- [ ] PDF downloads.

#### Content gate (Sun 23:00 → Mon 00:30)
- [ ] Aarsh has personally read one paid report end-to-end.
- [ ] Domain reviewer (or Aarsh) has spot-checked two more reports per
      `content-audit-checklist.md`.
- [ ] No invented verse numbers in any of the three reports.
- [ ] No fatalism, no medical/legal claims, no PII bleed.

#### Public site
- [ ] Hero `TRUST_STATS` shows the post-v6 content (Swiss Ephemeris, Lahiri,
      18 windows, 24h refund). No fake "12,000+ charts" or "★ 4.8 from 340+".
- [ ] Pricing page has no "Chosen by 60% of our seekers" text.
- [ ] "Most Popular" badge replaced with "Recommended" everywhere.
- [ ] Footer shows `support@vedichour.com` link.
- [ ] Refund page callout uses `support@vedichour.com` (not `hello@`).
- [ ] HindiWaitlist section appears on landing between Pricing and FAQ.
- [ ] Mobile Lighthouse score ≥ 85 on landing (not a hard fail at 80–85, but
      investigate single bad asset if so).

#### Burst tests (per v6 corrected acceptance)
- [ ] 3 same-user `/api/reports/start` returns **{202, 202, 202}**; 4th call
      returns **429**. (v5 had this wrong; corrected per v6 audit.)
- [ ] 50 RPS for 60s on `/api/health` p95 ≤ 300ms; zero 5xx.
- [ ] 5 sequential Ziina create-intents within 90s, with the **same** report
      ID, reuse the same intent (v6 catch — they're NOT 5 distinct IDs unless
      report IDs differ). Test reuse behaviour explicitly.

### NO-GO conditions — any one is enough

- [ ] Ziina production token uncertain.
- [ ] Inngest unavailable AND `REPORT_START_REQUIRE_INNGEST=true`.
- [ ] Any P0 report smoke fails to complete with non-empty days.
- [ ] Any paid output includes invented verse-level citations.
- [ ] Any paid output includes placeholder copy (`"Commentary is generating"`).
- [ ] Any paid output leaks system prompt text or another user's PII.
- [ ] Production `/api/health` returns 503 OR is unreachable.
- [ ] Upstash not configured in production (locks fall back to local memory
      → duplicate paid generation risk).
- [ ] Sentry not capturing events.

## Decision rule

**GO** = every line in the GO section ticked.
**NO-GO** = any single NO-GO line triggered.
**Fallback** = postpone to Mon 18:00 IST, fix the gap, re-run this checklist
              fresh. Do not lower gates to preserve the 06:00 launch date.

## Auditor sign-off

- Audit completed by: ___________________________________
- Date / time: ___________________________________
- Decision: ☐ GO at Mon 06:00 IST   ☐ FALLBACK to Mon 18:00 IST
- Notes: ___________________________________
