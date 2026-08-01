ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS installment_group uuid,
  ADD COLUMN IF NOT EXISTS installment_no integer,
  ADD COLUMN IF NOT EXISTS installment_total integer;
CREATE INDEX IF NOT EXISTS expenses_installment_group_idx ON public.expenses (installment_group);