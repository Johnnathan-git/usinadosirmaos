
-- Clients
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  color TEXT NOT NULL DEFAULT '#10b981',
  uc_number TEXT NOT NULL,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO anon, authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read clients" ON public.clients FOR SELECT USING (true);
CREATE POLICY "public write clients" ON public.clients FOR INSERT WITH CHECK (true);
CREATE POLICY "public update clients" ON public.clients FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public delete clients" ON public.clients FOR DELETE USING (true);

-- Invoices
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  uc_number TEXT NOT NULL,
  reference_date DATE NOT NULL,
  consumption_kw NUMERIC(14,4) NOT NULL DEFAULT 0,
  price_kw NUMERIC(14,4) NOT NULL DEFAULT 0,
  public_lighting NUMERIC(14,2) NOT NULL DEFAULT 0,
  interest_fine NUMERIC(14,2) NOT NULL DEFAULT 0,
  value_without_plant NUMERIC(14,2) NOT NULL DEFAULT 0,
  client_pays NUMERIC(14,2) NOT NULL DEFAULT 0,
  distributor_invoice NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX invoices_client_ref_idx ON public.invoices(client_id, reference_date);
CREATE INDEX invoices_ref_idx ON public.invoices(reference_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO anon, authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read invoices" ON public.invoices FOR SELECT USING (true);
CREATE POLICY "public write invoices" ON public.invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "public update invoices" ON public.invoices FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public delete invoices" ON public.invoices FOR DELETE USING (true);

-- Expenses
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference_date DATE NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX expenses_ref_idx ON public.expenses(reference_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO anon, authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read expenses" ON public.expenses FOR SELECT USING (true);
CREATE POLICY "public write expenses" ON public.expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "public update expenses" ON public.expenses FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public delete expenses" ON public.expenses FOR DELETE USING (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_expenses_updated BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
