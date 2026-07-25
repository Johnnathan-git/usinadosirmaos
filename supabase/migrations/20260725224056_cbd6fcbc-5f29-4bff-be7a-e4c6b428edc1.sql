
-- Inventory: assets
CREATE TABLE public.inventory_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item TEXT NOT NULL,
  location TEXT,
  category TEXT NOT NULL DEFAULT 'Placa Solar',
  brand TEXT,
  model TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_assets TO anon, authenticated;
GRANT ALL ON public.inventory_assets TO service_role;
ALTER TABLE public.inventory_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "p_read" ON public.inventory_assets FOR SELECT USING (true);
CREATE POLICY "p_ins" ON public.inventory_assets FOR INSERT WITH CHECK (true);
CREATE POLICY "p_upd" ON public.inventory_assets FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "p_del" ON public.inventory_assets FOR DELETE USING (true);
CREATE TRIGGER trg_assets_updated BEFORE UPDATE ON public.inventory_assets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Inventory: investment expenses
CREATE TABLE public.investment_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  spent_on DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investment_expenses TO anon, authenticated;
GRANT ALL ON public.investment_expenses TO service_role;
ALTER TABLE public.investment_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "p_read" ON public.investment_expenses FOR SELECT USING (true);
CREATE POLICY "p_ins" ON public.investment_expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "p_upd" ON public.investment_expenses FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "p_del" ON public.investment_expenses FOR DELETE USING (true);
CREATE TRIGGER trg_invexp_updated BEFORE UPDATE ON public.investment_expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Plant config (single row)
CREATE TABLE public.plant_config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  panels_count INTEGER NOT NULL DEFAULT 0,
  kw_per_panel NUMERIC(10,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.plant_config (id, panels_count, kw_per_panel) VALUES (1, 0, 0) ON CONFLICT DO NOTHING;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plant_config TO anon, authenticated;
GRANT ALL ON public.plant_config TO service_role;
ALTER TABLE public.plant_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "p_read" ON public.plant_config FOR SELECT USING (true);
CREATE POLICY "p_ins" ON public.plant_config FOR INSERT WITH CHECK (true);
CREATE POLICY "p_upd" ON public.plant_config FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "p_del" ON public.plant_config FOR DELETE USING (true);

-- Client allocations
CREATE TABLE public.client_allocations (
  client_id UUID PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
  allocation_pct NUMERIC(6,2) NOT NULL DEFAULT 0,
  avg_consumption NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_allocations TO anon, authenticated;
GRANT ALL ON public.client_allocations TO service_role;
ALTER TABLE public.client_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "p_read" ON public.client_allocations FOR SELECT USING (true);
CREATE POLICY "p_ins" ON public.client_allocations FOR INSERT WITH CHECK (true);
CREATE POLICY "p_upd" ON public.client_allocations FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "p_del" ON public.client_allocations FOR DELETE USING (true);
