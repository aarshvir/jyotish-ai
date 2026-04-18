-- Seed the three canonical promo codes.
--
-- NEWUSER30     — public launch offer, 30% off, unlimited uses
-- ADMIN100      — admin / owner, 100% off (free report), NOT advertised
-- FRIENDTESTING — private beta testers, 80% off, NOT advertised
--
-- Idempotent: re-running this migration will upsert on `code` and will NOT
-- clobber the existing `used_count`. It only ensures the rows exist and are
-- active with the intended discount percentages.

INSERT INTO promo_codes (code, discount_pct, max_uses, allowlist_emails, active, expires_at)
VALUES
  ('NEWUSER30',     30,  NULL, NULL, true, NULL),
  ('ADMIN100',     100,  NULL, NULL, true, NULL),
  ('FRIENDTESTING', 80,  NULL, NULL, true, NULL)
ON CONFLICT (code) DO UPDATE
  SET discount_pct = EXCLUDED.discount_pct,
      active       = true;
