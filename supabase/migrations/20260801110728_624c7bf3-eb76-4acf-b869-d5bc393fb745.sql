ALTER TABLE public.inventory_assets
  ADD COLUMN IF NOT EXISTS acquired_on date,
  ADD COLUMN IF NOT EXISTS serial_number text,
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.investment_expenses
  ADD COLUMN IF NOT EXISTS responsible text;