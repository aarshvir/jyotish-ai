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
