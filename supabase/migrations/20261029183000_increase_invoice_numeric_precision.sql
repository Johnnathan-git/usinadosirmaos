-- Preserve exact decimal values entered/calculated for invoices.
-- Existing values are kept; this only removes fixed scale rounding for future writes.
ALTER TABLE public.invoices
  ALTER COLUMN consumption_kw TYPE NUMERIC USING consumption_kw::NUMERIC,
  ALTER COLUMN price_kw TYPE NUMERIC USING price_kw::NUMERIC,
  ALTER COLUMN public_lighting TYPE NUMERIC USING public_lighting::NUMERIC,
  ALTER COLUMN interest_fine TYPE NUMERIC USING interest_fine::NUMERIC,
  ALTER COLUMN value_without_plant TYPE NUMERIC USING value_without_plant::NUMERIC,
  ALTER COLUMN client_pays TYPE NUMERIC USING client_pays::NUMERIC,
  ALTER COLUMN distributor_invoice TYPE NUMERIC USING distributor_invoice::NUMERIC;
