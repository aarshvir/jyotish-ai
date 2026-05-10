-- Add automatic updated_at tracking for Ziina payment rows.

ALTER TABLE public.ziina_payments
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE OR REPLACE FUNCTION public.set_ziina_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_ziina_payments_updated_at ON public.ziina_payments;

CREATE TRIGGER set_ziina_payments_updated_at
BEFORE UPDATE ON public.ziina_payments
FOR EACH ROW
EXECUTE FUNCTION public.set_ziina_payments_updated_at();
