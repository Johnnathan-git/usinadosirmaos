-- Persistência do saldo da Conta Bancária do Fluxo de Caixa
CREATE TABLE IF NOT EXISTS public.bank_account_state (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  initialized BOOLEAN NOT NULL DEFAULT FALSE,
  balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  invoice_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  expense_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  adjusted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_account_state TO anon, authenticated;
GRANT ALL ON public.bank_account_state TO service_role;

ALTER TABLE public.bank_account_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read bank account state" ON public.bank_account_state;
CREATE POLICY "public read bank account state"
ON public.bank_account_state FOR SELECT
USING (true);

DROP POLICY IF EXISTS "public write bank account state" ON public.bank_account_state;
CREATE POLICY "public write bank account state"
ON public.bank_account_state FOR INSERT
WITH CHECK (id = 1);

DROP POLICY IF EXISTS "public update bank account state" ON public.bank_account_state;
CREATE POLICY "public update bank account state"
ON public.bank_account_state FOR UPDATE
USING (id = 1)
WITH CHECK (id = 1);

CREATE OR REPLACE FUNCTION public.touch_bank_account_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_bank_account_state_updated ON public.bank_account_state;
CREATE TRIGGER trg_bank_account_state_updated
BEFORE UPDATE ON public.bank_account_state
FOR EACH ROW
EXECUTE FUNCTION public.touch_bank_account_state_updated_at();

INSERT INTO public.bank_account_state (id, initialized, balance)
VALUES (1, FALSE, 0)
ON CONFLICT (id) DO NOTHING;
