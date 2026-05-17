# Launch-Day Support Runbook

**Owner:** Aarsh
**Effective:** Mon 2026-05-18 06:00 IST → 23:59 IST
**Source:** v5 §3.10 + v6 corrections + this runbook

## 1. Monitoring posture

Keep these four tabs open from 06:00 IST onwards:

1. **Sentry** — error rate, slow transactions, source-mapped stack traces.
2. **Vercel** — function logs, build status, bandwidth, last-deploy diff.
3. **Supabase** — `reports`, `report_runs`, `agent_runs`, `report_generation_log`, `ziina_payments`, `ziina_webhook_events`.
4. **Ziina dashboard** — intents, payments, refunds.

Optional but cheap to have open: PostHog funnel (if PostHog shipped per the consent-gate), Inngest dashboard for the report function.

## 2. First-response SLAs

| User tier | First response within | Resolution window |
|---|---|---|
| Paid user | **2 hours** | 24 hours |
| Free user | **8 hours** | 72 hours |
| Refund request | 2 hours | Same day for verification, 3–5 business days to settle |

If you are away from the keyboard during the 06:00–23:59 window, set a Gmail vacation responder with a 2h-promise reply.

## 3. Standard responses (paste-ready)

### 3.1 "I paid but no report appeared in 5 minutes"
> Hi [name] — thanks for paying. Your report is generating in the background; the first commentary paragraph typically appears within 60–90 seconds and the full report within 3 minutes. If you still see nothing, please reply with the email you used to pay so I can pull the trace ID and check the pipeline state. — Aarsh / VedicHour

Internal action:
1. Lookup user in Supabase `auth.users` by email.
2. Find their latest row in `reports` — copy `generation_trace_id`.
3. Check `report_runs` and `report_generation_log` for that trace.
4. If stuck in a phase >5 min, re-dispatch via Inngest or refund manually.

### 3.2 "I want a refund"
> Hi [name] — happy to process that. Confirming the refund will be issued to your original Ziina payment method (5–10 business days). I'll do it now and email you the confirmation. No questions. — Aarsh / VedicHour

Internal action:
1. Open Ziina dashboard → find payment → issue refund.
2. Update `reports.payment_status` to `refunded` in Supabase.
3. Reply confirming refund issued.

### 3.3 "My birth time is wrong"
> Hi [name] — easy fix. Regenerating with corrected birth time costs $0 within your current plan window. Reply with the correct time (and as-precise-as-you-know city/state for that birth location) and I'll re-trigger the report. — Aarsh / VedicHour

Internal action:
1. Update the user's profile / birth data in the relevant table.
2. Trigger a new report generation for their plan.

### 3.4 "Do you support Hindi?"
> Hi [name] — Hindi reports are coming. We're staging the translation with a Vedic-trained reviewer so the Sanskrit terminology is correct, not auto-translated. If you email us, we'll notify you the day Hindi launches (no other emails in between). For now, every report is generated in English. — Aarsh / VedicHour

### 3.5 "Will this predict my marriage / health / job?"
> Hi [name] — VedicHour generates Jyotish forecasts that point to favourable and unfavourable windows for life decisions. We avoid medical, legal, and "guaranteed outcome" claims — Vedic astrology is a navigation tool, not a prophecy. If you have a specific question about how to read your report, reply and I'll help interpret it. — Aarsh / VedicHour

## 4. Escalation triggers

Stop everything and respond personally within 30 minutes if:

- A paid user reports they were charged but the report failed AND retry didn't fix it.
- More than 3 paid users in a single hour report stuck reports.
- Sentry error rate >5% over 15 minutes.
- `/api/health` returns 503 for any report-blocking dep for >10 minutes.
- A user reports they saw another person's name / report content (cross-user PII bleed).
- A user reports invented scripture verses or medical/legal advice in their report.

For PII bleed or invented scripture: pull the report, refund the user, post-mortem the prompt and RAG context immediately.

## 5. Kill switches (use these, don't write code)

| Switch | Env var | When to flip |
|---|---|---|
| Disable inline report fallback in prod | `REPORT_START_REQUIRE_INNGEST=true` | Already on; do not turn off unless Inngest is down AND you accept long synchronous functions |
| Disable upsell | `UPSELL_ENABLED=false` | If the upsell flow confuses users or causes payment retry loops |
| RAG mode keyword-only | `JYOTISH_RAG_MODE=keyword` | If vector retrieval is returning bad chunks but keyword still works. Do NOT use `off` — RAG should never be fully disabled |

## 6. Health check

`https://www.vedichour.com/api/health` returns:
- `200 + status: "healthy"` — all deps green.
- `200 + status: "degraded"` — analytics-tier dep (Sentry/PostHog) missing. Launch can proceed; investigate after.
- `503 + status: "unhealthy"` — at least one report-blocking dep down. List of blockers in `body.blockers`.

If `/api/health` itself is 503: check Vercel function logs, then check `body.blockers` for which dep failed.

## 7. Hard rule

**No paid user remains stuck >30 minutes without a personal ping from you, a manual retry, OR a refund.** Pick one of the three. Silence is worse than a refund.
