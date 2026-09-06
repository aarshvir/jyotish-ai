-- =====================================================================
-- VedicHour — PENDING SUPABASE MIGRATIONS (combined, run in SQL editor)
-- Generated for one-shot copy-paste. Every statement is idempotent
-- (IF NOT EXISTS / DROP ... IF EXISTS / CREATE OR REPLACE), so this is
-- SAFE to run even if some migrations were already applied.
-- Run the whole block top-to-bottom. Order matters for the publication ones.
--
-- What this turns on:
--   * pipeline_state paywall lockdown (free users can't read the full paid product)
--   * day_scores paywall narrowing (multi-day score curve is paid)
--   * standalone synastry/kundali purchase receipts (RLS)
--   * live report phase/error telemetry over Realtime
--   * atomic promo max_uses + once-per-user + promo-status RLS lockdown
--   * personal_context / notify_sent_at columns + analytics RLS hardening
-- =====================================================================


-- ---------------------------------------------------------------------
-- 20260620_fix_reports_replica_identity.sql  ⚠️ CRITICAL — RUN THIS
-- ---------------------------------------------------------------------
-- Reports were freezing at status='generating' forever because EVERY UPDATE to
-- the reports table was being rejected by Postgres:
--   42P10: cannot update table "reports" —
--          Column list used by the publication does not cover the replica identity.
--
-- Cause: 20260419 set `REPLICA IDENTITY FULL` (replica identity = ALL columns),
-- but #126 made the Realtime publication a COLUMN-LIST publication that excludes
-- the paid blobs (pipeline_state/pipeline_checkpoint). Postgres forbids a
-- column-list publication that doesn't cover every replica-identity column — with
-- FULL that's all columns — so it rejects all UPDATEs.
--
-- Fix: replica identity = primary key (`id`), which the column list DOES include.
-- UPDATEs work again; the column list still strips the paid blobs from Realtime
-- (paywall preserved); the client only reads payload.new so nothing visibly
-- changes. MUST run before the publication blocks below.
ALTER TABLE public.reports REPLICA IDENTITY DEFAULT;


-- ---------------------------------------------------------------------
-- 20260616_atomic_promo_redeem.sql
-- ---------------------------------------------------------------------
-- Atomic, idempotent promo redemption.
--
-- Replaces the app's non-atomic "insert redemption + increment used_count" pair
-- (which could double-increment on retry) with a single function that:
--   1. inserts the redemption row, relying on the partial UNIQUE index on
--      order_id (idx_promo_redemptions_order_id_unique) to dedupe retries, and
--   2. increments promo_codes.used_count ONLY when a new row was actually inserted.
--
-- Returns TRUE when a new redemption was booked, FALSE when it was a duplicate
-- (idempotent no-op). Safe to re-run this migration.

CREATE OR REPLACE FUNCTION public.redeem_promo_code(
  p_code_id  UUID,
  p_user_id  UUID,
  p_order_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'redeem_promo_code requires a non-null order_id for idempotency';
  END IF;

  INSERT INTO public.promo_redemptions (code_id, user_id, order_id)
  VALUES (p_code_id, p_user_id, p_order_id)
  ON CONFLICT (order_id) WHERE order_id IS NOT NULL
  DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    -- A redemption for this order_id already exists → idempotent no-op.
    RETURN FALSE;
  END IF;

  UPDATE public.promo_codes
  SET used_count = used_count + 1,
      updated_at = NOW()
  WHERE id = p_code_id;

  RETURN TRUE;
END;
$$;

-- Service-role only (the app calls it via the service client); never client-callable.
REVOKE EXECUTE ON FUNCTION public.redeem_promo_code(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.redeem_promo_code(UUID, UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.redeem_promo_code(UUID, UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_promo_code(UUID, UUID, TEXT) TO service_role;

-- ---------------------------------------------------------------------
-- 20260617_lock_down_promo_report_status.sql
-- ---------------------------------------------------------------------
-- CRITICAL payment-bypass fix.
-- The 20260514 lockdown forbade browser (anon-key) clients from writing
-- payment_status='paid', but the app later began treating payment_status='promo'
-- as fully paid-equivalent (report content gate, ask Q&A, calendar export, upsell,
-- and the standalone Kundali/Synastry access gates all accept 'promo'). With only
-- 'paid' forbidden, an authenticated user could `update({ payment_status:'promo' })`
-- on their own report row straight from the browser and self-grant the entire paid
-- experience for free.
--
-- Forbid BOTH entitled statuses from client writes. 'paid' and 'promo' may only be
-- set by the trusted server-side (service-role) payment/promo finalization paths,
-- which bypass RLS. All other statuses a browser legitimately writes (bypass/free/
-- unpaid/etc.) remain allowed. Idempotent (DROP IF EXISTS + CREATE).

DROP POLICY IF EXISTS "Users insert own reports" ON public.reports;
CREATE POLICY "Users insert own reports" ON public.reports
  FOR INSERT
  WITH CHECK (
    (select auth.uid()) = user_id
    AND COALESCE(payment_status, '') NOT IN ('paid', 'promo')
  );

DROP POLICY IF EXISTS "Users update own reports" ON public.reports;
CREATE POLICY "Users update own reports" ON public.reports
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK (
    (select auth.uid()) = user_id
    AND COALESCE(payment_status, '') NOT IN ('paid', 'promo')
  );

-- ---------------------------------------------------------------------
-- 20260617_reports_notify_sent_at.sql
-- ---------------------------------------------------------------------
-- Idempotency marker for the "your report is ready" email + WhatsApp notification.
-- notifyReportReady() is called inside a retryable Inngest finalize step, so without a
-- claim a step retry re-sends the email AND the WhatsApp (real Twilio cost + spam). A
-- conditional `UPDATE ... SET notify_sent_at = now() WHERE id = ? AND notify_sent_at IS
-- NULL` lets exactly one finalize win and send. Nullable, no backfill, safe to re-run.
-- 20260426_reports_generation_error_columns.sql  (was never applied to prod — caused stuck 'generating')
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS generation_error_code TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS generation_error_at_phase TEXT;

ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS notify_sent_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------
-- 20260617_reports_personal_context.sql
-- ---------------------------------------------------------------------
-- Optional free-text the seeker writes about themselves at onboarding
-- ("what's on your mind / biggest problems / context about yourself").
-- Flows into LLM report generation to personalize the commentary.
-- Mirrors the phone column (20260614_user_phone). Nullable, no backfill, safe to re-run.
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS personal_context TEXT;

-- ---------------------------------------------------------------------
-- 20260617_rls_hardening_analytics_search_path.sql
-- ---------------------------------------------------------------------
-- Two low-severity hardening fixes from the deep audit.

-- [18] analytics_events INSERT was `WITH CHECK (auth.uid() = user_id OR user_id IS NULL)`,
-- so any holder of the public anon key could insert unlimited forged events with
-- user_id NULL, poisoning the admin funnel/acquisition dashboards. Every legitimate
-- write goes through the service role (RLS-bypassing), so the public policy grants
-- nothing the product needs. Drop the OR-NULL branch.
DROP POLICY IF EXISTS "Users insert own analytics" ON public.analytics_events;
CREATE POLICY "Users insert own analytics" ON public.analytics_events
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- [17] Pin search_path on the RAG search function for parity with every other function
-- in the schema (handle_new_user, redeem_promo_code, etc. all SET search_path = public).
-- Tolerant: skip if the 768-dim signature isn't present (DB still on the 1536-dim def).
DO $$
BEGIN
  ALTER FUNCTION public.match_jyotish_scriptures(vector(768), int, float) SET search_path = public;
EXCEPTION WHEN undefined_function THEN
  NULL;
END $$;

-- ---------------------------------------------------------------------
-- 20260619_narrow_free_day_scores.sql
-- ---------------------------------------------------------------------
-- Narrow day_scores on existing free/preview rows to the single preview day
-- (audit cycle 8, [11]). day_scores (date->score map) is the paid day-by-day
-- score curve. dbSaveFinal already narrows it to the sliced preview day going
-- forward, and the orchestrator's intermediate write now narrows too, but
-- historical free rows (created before the preview-strip work, or that failed
-- mid-generation) still carry the full multi-day curve, readable by the free
-- owner via select('*') / Realtime. Narrow each such row to only the date present
-- in its already-stripped report_data (or empty if none). Idempotent: only
-- touches free/preview rows that still have more than one score entry.

UPDATE public.reports
SET day_scores = COALESCE(
  (CASE
     WHEN report_data->'days'->0->>'date' IS NOT NULL
          AND day_scores ? (report_data->'days'->0->>'date')
     THEN jsonb_build_object(
            report_data->'days'->0->>'date',
            day_scores->(report_data->'days'->0->>'date'))
     ELSE NULL
   END),
  '{}'::jsonb)
WHERE plan_type IN ('free', 'preview')
  AND day_scores IS NOT NULL
  AND jsonb_typeof(day_scores) = 'object'
  AND (SELECT count(*) FROM jsonb_object_keys(day_scores)) > 1;

-- ---------------------------------------------------------------------
-- 20260619_promo_max_uses_atomic.sql
-- ---------------------------------------------------------------------
-- Enforce promo max_uses ATOMICALLY at redemption time.
-- Before: max_uses was only a soft read-time check in getPromoDiscount (intent-create),
-- and the RPC incremented used_count unconditionally — so N concurrent checkouts could
-- all pass the create-time check and push used_count well past max_uses (a "first 10
-- customers" code honored far more than 10 times). Now the increment is conditional on
-- staying under the cap; if the cap is already reached, the just-inserted redemption is
-- rolled back and the function returns FALSE. Idempotent (CREATE OR REPLACE), safe to re-run.

CREATE OR REPLACE FUNCTION public.redeem_promo_code(
  p_code_id  UUID,
  p_user_id  UUID,
  p_order_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_updated INT;
BEGIN
  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'redeem_promo_code requires a non-null order_id for idempotency';
  END IF;

  INSERT INTO public.promo_redemptions (code_id, user_id, order_id)
  VALUES (p_code_id, p_user_id, p_order_id)
  ON CONFLICT (order_id) WHERE order_id IS NOT NULL
  DO NOTHING
  RETURNING id INTO v_id;

  -- Already redeemed under this order_id (idempotent replay / once-per-user dedup).
  IF v_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Atomically bump used_count ONLY while under the cap.
  UPDATE public.promo_codes
  SET used_count = used_count + 1,
      updated_at = NOW()
  WHERE id = p_code_id
    AND (max_uses IS NULL OR used_count < max_uses);
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- Cap already reached: undo the redemption we just booked and report failure.
  IF v_updated = 0 THEN
    DELETE FROM public.promo_redemptions WHERE id = v_id;
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.redeem_promo_code(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.redeem_promo_code(UUID, UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.redeem_promo_code(UUID, UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_promo_code(UUID, UUID, TEXT) TO service_role;

-- ---------------------------------------------------------------------
-- 20260619_protect_pipeline_state_columns.sql
-- ---------------------------------------------------------------------
-- CRITICAL paywall fix (audit cycle 7, finding [1]).
--
-- reports.pipeline_state / pipeline_checkpoint hold the fully-populated PAID
-- product (12-month forecast, weekly synthesis, all-day hourly commentary,
-- nativity text) during generation, so the pipeline can resume between Inngest
-- steps. But these columns sit on the owner-readable `reports` row: the owner's
-- RLS SELECT policy + REPLICA IDENTITY FULL (Realtime) exposed them to a
-- free/preview user who never paid for that content. All prior paywall hardening
-- stripped only report_data and missed these two columns.
--
-- Fix: revoke column-level SELECT from the client roles. The orchestrator and all
-- checkpoint read/writes use the service_role (createServiceClient), which is
-- unaffected by these grants, so resume keeps working. PostgREST resolves
-- `select('*')` against the columns the requesting role may read, so existing
-- client queries keep working and simply no longer receive these blobs (no client
-- code reads them). Idempotent — safe to re-run.

REVOKE SELECT (pipeline_state, pipeline_checkpoint) ON public.reports FROM authenticated;
REVOKE SELECT (pipeline_state, pipeline_checkpoint) ON public.reports FROM anon;

-- Restrict the Realtime publication for `reports` to a safe column allow-list so
-- UPDATE broadcasts (REPLICA IDENTITY FULL) never carry the pipeline blobs to
-- subscribed clients. Lists every column EXCEPT pipeline_state/pipeline_checkpoint.
-- Wrapped so it is a no-op if the publication/table membership isn't present.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'reports'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.reports;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reports (
      id, user_id, user_email, native_name, birth_date, birth_time, birth_city,
      birth_lat, birth_lng, current_city, current_lat, current_lng, timezone_offset,
      plan_type, payment_status, payment_provider, status, lagna_sign, moon_sign,
      moon_nakshatra, dasha_mahadasha, dasha_antardasha, day_scores, report_data,
      generation_progress, generation_started_at, generation_completed_at,
      generation_time_seconds, generation_trace_id, created_at, updated_at
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Column-list publications require PG15+. If unsupported, the column REVOKE above
  -- is the primary protection; log and continue rather than failing the migration.
  RAISE NOTICE 'Could not set column-list publication for reports: %', SQLERRM;
END $$;

-- One-time backfill: clear the blobs from any already-terminal rows (they no
-- longer need resume), so historical free/preview reports stop carrying paid copy.
UPDATE public.reports
SET pipeline_state = NULL, pipeline_checkpoint = NULL
WHERE status IN ('complete', 'error')
  AND (pipeline_state IS NOT NULL OR pipeline_checkpoint IS NOT NULL);

-- ---------------------------------------------------------------------
-- 20260619_realtime_publication_restore_columns.sql
-- ---------------------------------------------------------------------
-- Restore live-telemetry columns to the reports Realtime publication (audit cycle 8, [8][9][13][25]).
--
-- #126 (20260619_protect_pipeline_state_columns) replaced the reports Realtime
-- publication with a hand-typed column allow-list to keep pipeline_state/
-- pipeline_checkpoint off the wire. That list accidentally dropped columns the
-- client reads live during generation — generation_step (phase label),
-- generation_error_code / generation_error_at_phase (error CTA + diagnostic) —
-- plus report_start_date/report_end_date/notify_sent_at/personal_context. On
-- PG15+ a column-list publication strips non-listed columns from payload.new, so
-- the GeneratingScreen phase telemetry and error metadata silently went blank on
-- the Realtime path (still works via the slower /status poll).
--
-- This redoes the publication with the FULL column set EXCEPT the two sensitive
-- blobs (pipeline_state, pipeline_checkpoint — still column-REVOKED by #126) and
-- the large append-only generation_log (read via its own endpoint, not Realtime).
-- Idempotent. Re-derive this list if reports ever gains a column.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'reports'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.reports;
  END IF;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.reports (
    id, user_id, user_email, native_name, birth_date, birth_time, birth_city,
    birth_lat, birth_lng, current_city, current_lat, current_lng, timezone_offset,
    plan_type, report_start_date, report_end_date, lagna_sign, moon_sign,
    moon_nakshatra, dasha_mahadasha, dasha_antardasha, day_scores, report_data,
    status, payment_status, payment_provider, generation_step, generation_progress,
    generation_started_at, generation_completed_at, generation_time_seconds,
    generation_error_code, generation_error_at_phase, generation_trace_id,
    notify_sent_at, personal_context, phone, upsell_dismissed_at,
    upsell_converted_at, created_at, updated_at
  );
EXCEPTION WHEN OTHERS THEN
  -- Column-list publications require PG15+. On older servers the #126 column
  -- REVOKE on pipeline_state/pipeline_checkpoint is the protection and the
  -- full-table publication already carries every telemetry column. Log + continue.
  RAISE NOTICE 'Could not set column-list publication for reports: %', SQLERRM;
END $$;

-- ---------------------------------------------------------------------
-- 20260619_strip_existing_free_report_data.sql
-- ---------------------------------------------------------------------
-- CRITICAL paywall backfill. Free/preview reports were historically generated AND stored
-- in full, and report_data is readable by the owner via the direct Supabase client and
-- Supabase Realtime (replica identity full) — both bypass the API-layer strip. The
-- orchestrator now stores only the preview subset for NEW free reports; this one-time
-- backfill does the same for EXISTING free/preview rows: drop the paid sections
-- (months / weeks / synthesis) and keep only the first sample day.
-- Idempotent: the WHERE clause skips rows already stripped, so it's safe to re-run.

UPDATE public.reports
SET report_data = jsonb_set(
      report_data - 'months' - 'weeks' - 'synthesis',
      '{days}',
      CASE
        WHEN jsonb_typeof(report_data -> 'days') = 'array'
             AND jsonb_array_length(report_data -> 'days') > 0
          THEN jsonb_build_array(report_data -> 'days' -> 0)
        ELSE COALESCE(report_data -> 'days', '[]'::jsonb)
      END
    )
WHERE plan_type IN ('free', 'preview')
  AND report_data IS NOT NULL
  AND (
    report_data ? 'months'
    OR report_data ? 'weeks'
    OR report_data ? 'synthesis'
    OR (jsonb_typeof(report_data -> 'days') = 'array' AND jsonb_array_length(report_data -> 'days') > 1)
  );

-- ---------------------------------------------------------------------
-- 20260619_ziina_payments_user_select.sql
-- ---------------------------------------------------------------------
-- Make standalone (synastry/kundali) purchases visible to their buyer (audit cycle 7, [4]+[13]).
--
-- #122 changed /api/user/payments to filter ziina_payments.user_id directly so
-- report-less standalone unlocks (report_id = NULL) show in the buyer's history.
-- But that route uses the RLS-enforced anon client, and the only SELECT policy on
-- ziina_payments still gates on report_id IN (user's reports) — which never matches
-- a report_id = NULL row. So standalone buyers STILL saw no receipt. Broaden the
-- policy to also allow owner reads via user_id, and backfill user_id on legacy
-- rows (the column was added later, ON DELETE SET NULL) so pre-existing
-- report-bound charges resolve under the new direct filter too. Idempotent.

UPDATE public.ziina_payments z
SET user_id = r.user_id
FROM public.reports r
WHERE z.report_id = r.id
  AND z.user_id IS NULL
  AND r.user_id IS NOT NULL;

DROP POLICY IF EXISTS "Users can view own ziina payments" ON public.ziina_payments;
CREATE POLICY "Users can view own ziina payments"
  ON public.ziina_payments FOR SELECT
  USING (
    user_id = auth.uid()
    OR report_id IN (SELECT id FROM public.reports WHERE user_id = auth.uid())
  );

-- 20260620_analytics_session_index.sql — per-visitor journey analytics.
-- Indexes analytics_events by session_id (inside JSONB properties) so the admin
-- /admin/journeys list + /admin/journeys/[sid] timeline scan one visitor fast.
-- Additive, backward-compatible. The pages work without it; this is perf only.
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_created
  ON public.analytics_events ((properties->>'session_id'), created_at)
  WHERE properties ? 'session_id';

-- ============================================================================
-- 2026-07-02: Resonance loop (day_ratings) — one-tap "how did the day feel"
-- vs predicted score. Powers user alignment view + admin correlations.
-- Additive + idempotent. REQUIRED before the resonance-loop feature works.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.day_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_id UUID REFERENCES public.reports(id) ON DELETE SET NULL,
  rated_date DATE NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating IN (-1, 0, 1)),
  predicted_score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uniq_day_rating_per_user_day UNIQUE (user_id, rated_date)
);
CREATE INDEX IF NOT EXISTS idx_day_ratings_user ON public.day_ratings (user_id, rated_date DESC);
CREATE INDEX IF NOT EXISTS idx_day_ratings_created ON public.day_ratings (created_at DESC);
ALTER TABLE public.day_ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "day_ratings_select_own" ON public.day_ratings;
CREATE POLICY "day_ratings_select_own" ON public.day_ratings
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "day_ratings_insert_own" ON public.day_ratings;
CREATE POLICY "day_ratings_insert_own" ON public.day_ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "day_ratings_update_own" ON public.day_ratings;
CREATE POLICY "day_ratings_update_own" ON public.day_ratings
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 20260703_email_suppressions.sql  (one-click unsubscribe + CAN-SPAM)
-- ---------------------------------------------------------------------
-- Suppression list checked before every marketing/nurture send; /api/unsubscribe
-- writes to it. Service-role only (RLS on, no client policies). Idempotent.
CREATE TABLE IF NOT EXISTS public.email_suppressions (
  email      TEXT PRIMARY KEY,
  reason     TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 2026-07-25: Campaign Control Panel + Insights Engine (marketing_* tables)
-- Mirror of supabase/migrations/20260725_marketing_campaign_state.sql — keep in sync.
-- ============================================================================
-- One row per campaign asset (reel today; kind is open for future formats).
-- Localized dubbed variants (Sarvam TTS + lip-sync) are their own rows with
-- language set (hi/ta/te/bn/mr/...) and parent_slug pointing at the original.
CREATE TABLE IF NOT EXISTS public.marketing_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL DEFAULT 'reel',
  status TEXT NOT NULL DEFAULT 'ready_to_render'
    CHECK (status IN ('ready_to_render', 'rendered', 'published_manual', 'published_auto', 'killed')),
  hook TEXT,
  language TEXT DEFAULT 'hinglish',
  parent_slug TEXT,
  script JSONB,
  hashtags JSONB,
  youtube_title TEXT,
  youtube_description TEXT,
  utm_campaign TEXT,
  video_path TEXT,
  youtube_video_id TEXT,
  instagram_permalink TEXT,
  render_cost_usd NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Idempotent upgrades for tables created before the localization stage.
ALTER TABLE public.marketing_assets ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'hinglish';
ALTER TABLE public.marketing_assets ADD COLUMN IF NOT EXISTS parent_slug TEXT;
CREATE INDEX IF NOT EXISTS idx_marketing_assets_status ON public.marketing_assets (status);
CREATE INDEX IF NOT EXISTS idx_marketing_assets_parent ON public.marketing_assets (parent_slug);
ALTER TABLE public.marketing_assets ENABLE ROW LEVEL SECURITY;

-- Append-only time series: one row per stats poll per asset → hour-by-hour trends.
CREATE TABLE IF NOT EXISTS public.marketing_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.marketing_assets(id) ON DELETE CASCADE,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'youtube' CHECK (source IN ('youtube', 'instagram', 'manual')),
  views BIGINT NOT NULL DEFAULT 0,
  likes BIGINT NOT NULL DEFAULT 0,
  comments BIGINT NOT NULL DEFAULT 0,
  shares BIGINT,
  watch_pct NUMERIC,
  raw JSONB
);
CREATE INDEX IF NOT EXISTS idx_marketing_stats_asset_time ON public.marketing_stats (asset_id, captured_at DESC);
ALTER TABLE public.marketing_stats ENABLE ROW LEVEL SECURITY;

-- Plain-English verdicts from the insights loop (brain-generated, rule-guarded).
CREATE TABLE IF NOT EXISTS public.marketing_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  period TEXT,
  headline TEXT,
  body TEXT,
  actions JSONB, -- [{assetSlug, action: 'kill'|'double'|'watch', reason, confidence}]
  raw JSONB
);
CREATE INDEX IF NOT EXISTS idx_marketing_insights_generated ON public.marketing_insights (generated_at DESC);
ALTER TABLE public.marketing_insights ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------
-- 20260726_marketing_hook_taxonomy.sql
-- ---------------------------------------------------------------------
-- Closes the marketing learning loop. The engine learned from REJECTIONS but not
-- from RESULTS: marketing_stats recorded views against an asset SLUG, and a slug
-- says nothing about the SHAPE of the creative, so "which hooks actually perform?"
-- had no join key. These four columns are that key — every reel variant is now
-- tagged at creation (hook family / decision domain / emotional register / target
-- duration), loop:sync mirrors the tags here, and the creative engine reads the
-- per-tag performance back into the script-writing prompt.
-- Purely additive. loop:sync keeps working without them; it just cannot attribute.
ALTER TABLE public.marketing_assets ADD COLUMN IF NOT EXISTS hook_family TEXT;
ALTER TABLE public.marketing_assets ADD COLUMN IF NOT EXISTS decision_domain TEXT;
ALTER TABLE public.marketing_assets ADD COLUMN IF NOT EXISTS emotional_register TEXT;
ALTER TABLE public.marketing_assets ADD COLUMN IF NOT EXISTS duration_target_sec NUMERIC;
CREATE INDEX IF NOT EXISTS idx_marketing_assets_hook_family ON public.marketing_assets (hook_family);
CREATE INDEX IF NOT EXISTS idx_marketing_assets_decision_domain ON public.marketing_assets (decision_domain);

-- ---------------------------------------------------------------------
-- 20260817_lock_down_bypass_report_status.sql
-- ---------------------------------------------------------------------
-- CRITICAL payment-bypass fix (#208 regression).
-- #208 treated payment_status='bypass' as paid-equivalent (Ask, hourly-day,
-- personalized, upgrade, status payload) while RLS still allowed the browser
-- to write 'bypass' and the report page defaulted new rows to it.
ALTER TABLE public.reports ALTER COLUMN payment_status SET DEFAULT 'unpaid';

DROP POLICY IF EXISTS "Users insert own reports" ON public.reports;
CREATE POLICY "Users insert own reports" ON public.reports
  FOR INSERT
  WITH CHECK (
    (select auth.uid()) = user_id
    AND COALESCE(payment_status, '') NOT IN ('paid', 'promo', 'bypass')
  );

DROP POLICY IF EXISTS "Users update own reports" ON public.reports;
CREATE POLICY "Users update own reports" ON public.reports
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK (
    (select auth.uid()) = user_id
    AND COALESCE(payment_status, '') NOT IN ('paid', 'promo', 'bypass')
  );

UPDATE public.reports r
SET payment_status = CASE
  WHEN COALESCE(r.plan_type, '') IN ('free', 'preview') THEN 'free'
  ELSE 'unpaid'
END
WHERE r.payment_status = 'bypass'
  AND r.status IN ('generating', 'pending')
  AND r.generation_completed_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.ziina_payments z
    WHERE z.report_id = r.id
      AND z.status = 'completed'
  );

