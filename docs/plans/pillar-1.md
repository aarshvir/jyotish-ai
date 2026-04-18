# Pillar 1 — Durable Pipeline (Per-Phase Inngest DAG + Ziina Webhook + Realtime)

**Status:** prerequisite for Pillars 2–4. Do not start later pillars until this is verified in production.

---

## Goal

Make report generation survive any single failure (Vercel timeout, Claude 529, browser tab close, Ziina redirect loss) without leaving a user stuck on "generating" after a successful payment.

**Acceptance (all four must pass):**

1. A report that fails mid-phase retries only the failed phase, not the full 5-minute job.
2. A user who closes the tab immediately after paying still gets a `paid` report within 60s (webhook-driven, not redirect-driven).
3. `GeneratingScreen` receives phase updates over Supabase Realtime (no 3-second HTTP polling).
4. `npx tsc --noEmit` passes; `/api/reports/run` returns 410 Gone; Ziina test payment end-to-end succeeds with `curl -I` showing redirect to `/report/{id}?payment_status=paid`.

---

## Files Cursor will change / create

### Fix / align

- `.env.example` — rename `ZIINA_API_KEY` → `ZIINA_API_TOKEN` (line 12) to match [src/lib/ziina/server.ts:92](../../src/lib/ziina/server.ts).
- `src/app/api/reports/run/route.ts` — deprecate (return 410 Gone); single ingress becomes `/api/reports/start`.
- `src/app/api/reports/[id]/stream/route.ts` — stop invoking the pipeline; become a pure read-side SSE projection that tails `reports.generation_step` / `generation_progress` changes.
- `src/app/api/reports/start/route.ts` — require Inngest path; if `INNGEST_EVENT_KEY` missing in production, 503 with clear error (dev-only inline fallback kept behind `NODE_ENV !== 'production'`).

### Decompose orchestrator into explicit phases

- `src/lib/reports/orchestrator.ts` — split the monolithic body into exported phase functions, each idempotent against `pipeline_checkpoint`:
  - `runEphemerisPhase(ctx)`
  - `runNativityPhase(ctx)`
  - `runDailyGridsPhase(ctx)`
  - `runDailyCommentaryPhase(ctx)`
  - `runHourlyCommentaryPhase(ctx)` (18 buckets/day, never drifts from locked contract)
  - `runWeeksMonthsSynthesisPhase(ctx)`
  - `runFinalizePhase(ctx)`
  - Shared `PhaseContext` type carrying `reportId`, `supabase`, `anthropic`, `budgetSignal`, `authHeaders`, `base`.
- `src/lib/inngest/functions.ts` — replace single `step.run("generate-report", ...)` with seven per-phase `step.run` calls. Each phase writes `generation_step` + `generation_progress` on entry. Use Inngest's `step.sleep` between phases only if rate-limit hit.

### Ziina webhook

- `src/app/api/ziina/webhook/route.ts` — new route. Verifies HMAC with `ZIINA_WEBHOOK_SECRET`, idempotent via `ziina_payments.ziina_intent_id`, flips `ziina_payments.status = completed` + `reports.payment_status = paid`, then emits `report/generate` to Inngest. Must return 200 within 3s (Ziina retries otherwise).
- `src/lib/ziina/verifyWebhook.ts` — HMAC verification helper (constant-time compare).
- `supabase/migrations/<new>_ziina_webhook_events.sql` — `ziina_webhook_events(id uuid pk, event_id text unique, payload jsonb, received_at timestamptz, processed_at timestamptz)` for replay protection.

### Client Realtime

- `src/app/(app)/report/[id]/page.tsx` — replace 3s `startPollingForReport` with Supabase Realtime subscription on `reports` row. Keep one 10s keepalive poll as a safety net if the channel dies.
- `src/lib/supabase/realtime.ts` — thin helper that returns a typed channel for `postgres_changes` on `public.reports` filtered by `id=eq.<reportId>`.
- `supabase/migrations/<new>_reports_realtime.sql` — `alter publication supabase_realtime add table public.reports;` (idempotent via `do $$ begin ... exception when duplicate_object then null; end $$`).

### Remove dead inline code

- Delete or gate `void generateReportPipeline(...)` fire-and-forget at [src/app/api/reports/[id]/stream/route.ts:83–96](../../src/app/api/reports/[id]/stream/route.ts).

---

## Cursor does (ordered, each step idempotent)

1. Fix `.env.example` line 12: `ZIINA_API_KEY` → `ZIINA_API_TOKEN`. Grep repo for any other `ZIINA_API_KEY` refs and correct.
2. Create `supabase/migrations/20260419_reports_realtime.sql` and `20260419_ziina_webhook_events.sql`. Guard both with `if not exists` / `exception when duplicate_object`.
3. Extract phases from `src/lib/reports/orchestrator.ts` into `src/lib/reports/phases/*.ts` (one file per phase). Keep `generateReportPipeline` as a thin compatibility wrapper that composes the phases in sequence — so dev-mode inline still works. Preserve the locked contract: 18 hourly buckets, `day_score = mean(18)`, fallback commentary never empty.
4. Rewrite `src/lib/inngest/functions.ts` to call each phase in its own `step.run`. Set `retries: 3` on the function and propagate `event.data.reportId` into `concurrency.key`.
5. Add `src/lib/ziina/verifyWebhook.ts` using `crypto.timingSafeEqual` on `sha256(ZIINA_WEBHOOK_SECRET + rawBody)` (use the scheme Ziina documents; confirm header name from their dashboard — noted in "You do" step 3).
6. Create `src/app/api/ziina/webhook/route.ts` with:
   - `runtime = 'nodejs'`, `dynamic = 'force-dynamic'`.
   - Read raw body via `request.text()` (HMAC needs exact bytes).
   - Insert into `ziina_webhook_events` with unique `event_id`; if conflict, return 200 immediately (replay).
   - Look up `ziina_payments` by `intent_id`; if `status === 'completed'`, return 200 (idempotent).
   - Update `ziina_payments.status = 'completed'`, `reports.payment_status = 'paid'`.
   - `await inngest.send({ name: 'report/generate', data: {...} })`.
   - Return `{ ok: true }` in <3s; do any heavy work in Inngest, not here.
7. Modify `src/app/api/ziina/verify/route.ts` to remain as a user-facing redirect endpoint only (it already is) and no longer be the source of truth for flipping payment status — the webhook is. Keep idempotent behavior so the browser redirect still produces the right UX if it arrives first.
8. Add `src/lib/supabase/realtime.ts` + wire `src/app/(app)/report/[id]/page.tsx` to subscribe on mount, unsubscribe on unmount. Keep the existing poll as a 10s fallback if `channel.state !== 'joined'` after 5s.
9. Gate `src/app/api/reports/run/route.ts` behind a `410 Gone` response with body explaining to use `/api/reports/start`.
10. Refactor `src/app/api/reports/[id]/stream/route.ts` to read-only SSE: poll DB every 1s server-side, push `event: phase` frames. Remove the `void generateReportPipeline(...)` call.
11. Run `npx tsc --noEmit`; fix any type errors introduced.
12. Run lint.

### Local verification script

Add `scripts/verify-pillar-1.mjs` that:

- Hits `/api/ziina/webhook` with a signed test payload and asserts 200.
- Hits it again with the same `event_id` and asserts 200 (idempotent replay).
- Reads the `reports` row and asserts `payment_status = paid`.
- Asserts `inngest` received a `report/generate` event (check via Inngest dev server `/api/inngest/runs` if running locally).

---

## You do (exact click-by-click)

Do these **in this order**. Pause before Cursor runs deploy so env vars are in place.

### 1. Inngest Cloud account & keys

1. Go to https://www.inngest.com/ → "Sign up" with GitHub.
2. Create workspace "vedichour-prod" (and optionally "vedichour-dev").
3. In the workspace sidebar: **Manage → Event Keys** → "Create Event Key" → name it `vercel-prod` → copy the value. This is `INNGEST_EVENT_KEY`.
4. Sidebar: **Manage → Signing Keys** → copy the "Signing Key". This is `INNGEST_SIGNING_KEY`.
5. Sidebar: **Apps → Sync new app** → choose "Vercel" → enter app URL `https://www.vedichour.com/api/inngest` → click Sync. If it says "not found", come back after deploy step 6 and retry.

### 2. Supabase — run the two new migrations

1. Go to https://supabase.com/dashboard → your project → **SQL Editor** → "New query".
2. Open `supabase/migrations/20260419_reports_realtime.sql` from this repo, paste into the editor, click **Run**. Expect "Success, no rows returned".
3. Repeat for `supabase/migrations/20260419_ziina_webhook_events.sql`.
4. Sidebar: **Database → Replication** → `supabase_realtime` publication → confirm `reports` is listed. If not, click "Manage" and enable it for `reports`.
5. Sidebar: **Database → Tables → reports** → **RLS** → confirm you have a `select using (auth.uid() = user_id)` policy (it already exists; just verify).

### 3. Ziina — add webhook endpoint

1. Log in at https://business.ziina.com/ (same account whose `ZIINA_API_TOKEN` you already have).
2. **Settings → Developers → Webhooks** → "Add endpoint".
3. URL: `https://www.vedichour.com/api/ziina/webhook`.
4. Events to subscribe: check `payment_intent.completed`, `payment_intent.failed`, `payment_intent.canceled`.
5. Click "Create". Ziina will show you a signing secret (one-time display). **Copy it immediately** — this is `ZIINA_WEBHOOK_SECRET`.
6. Note the header name Ziina uses for its signature (shown on the same screen, typically `ziina-signature` or `x-ziina-signature`). Paste the exact header name into the GitHub issue / chat reply so Cursor can hard-code the correct `request.headers.get('...')` in `verifyWebhook.ts`. If unsure, copy a sample test-event's headers from the webhook dashboard ("Send test event" button) and paste those.

### 4. Vercel — environment variables

1. Go to https://vercel.com/ → your team → `jyotish-ai` (or whatever the project is named) → **Settings → Environment Variables**.
2. Add these three (Production + Preview + Development checkboxes all ticked):
   - `INNGEST_EVENT_KEY` = value from **You do step 1.3**.
   - `INNGEST_SIGNING_KEY` = value from **You do step 1.4**.
   - `ZIINA_WEBHOOK_SECRET` = value from **You do step 3.5**.
3. Verify `ZIINA_API_TOKEN` already exists (it must — it's your live key). If you see `ZIINA_API_KEY` instead, rename it to `ZIINA_API_TOKEN` (delete the old, add new with same value).
4. Click **Save** on each. Do **not** redeploy yet — Cursor will push the code first.

### 5. After Cursor pushes the PR

1. Vercel auto-deploys. Wait for the build to go green in https://vercel.com/<team>/jyotish-ai/deployments.
2. Open https://www.vedichour.com/api/inngest in a browser — you should see `{"message":"Inngest endpoint operational"}` or similar (not a 404 or a "function not found" error).
3. Go back to Inngest dashboard (**You do step 1.5**) and re-sync the app if you skipped it earlier. You should now see the function `generate-report-pipeline` listed with 7 steps.
4. Run a test Ziina payment:
   - Open https://www.vedichour.com/onboard in an **incognito** window.
   - Complete a 7-day plan checkout using Ziina's **test card** (documented in their dashboard → Developers → Test Cards).
   - **Immediately close the tab** after submitting payment (do not wait for the redirect).
   - Wait 30 seconds. Open a new tab → log in → **/dashboard**. The new report should exist with `payment_status = paid` and `status = generating` or `complete`.
   - Inngest dashboard → **Runs** → you should see a `report/generate` run with 7 green steps.
5. If any step is red in Inngest: click it → copy the error → paste into chat. Cursor will fix and redeploy.

### 6. Rollback (if anything goes wrong)

- Vercel → **Deployments** → previous green deployment → **Promote to Production** (1 click).
- Inngest paused runs auto-resume on next deploy; no manual cleanup needed.
- If the webhook is misbehaving, go to Ziina → **Settings → Developers → Webhooks** → **Disable** the endpoint. `/api/ziina/verify` (browser redirect) still flips payment status as today, so users aren't blocked.

---

## Acceptance check (run after step 5)

```powershell
# From the repo root
npx tsc --noEmit
curl -i https://www.vedichour.com/api/reports/run    # expect HTTP/2 410
curl -i https://www.vedichour.com/api/inngest        # expect 200 + JSON
```

Manual: load `/report/<id>` during generation; open DevTools → Network → WS — you should see a Supabase Realtime `phx_reply` frame within 2 seconds of page load, and no 3-second polling on `/api/reports/<id>/status`.

---

## Out of scope for Pillar 1

- Any RAG expansion (that is Pillar 2).
- New rasi-chart UI (Pillar 3).
- Upsell funnel / synastry (Pillar 4).
