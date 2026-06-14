-- First-touch attribution: store the channel/UTM/referrer that brought each user,
-- captured at first visit (cookie) and persisted at signup. Powers the admin
-- Attribution view (channel -> signups -> paid -> revenue). Safe to re-run.
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS first_touch_source   TEXT,
  ADD COLUMN IF NOT EXISTS first_touch_medium   TEXT,
  ADD COLUMN IF NOT EXISTS first_touch_campaign TEXT,
  ADD COLUMN IF NOT EXISTS first_touch_referrer TEXT,
  ADD COLUMN IF NOT EXISTS first_touch_landing  TEXT,
  ADD COLUMN IF NOT EXISTS first_touch_at       TIMESTAMPTZ;
