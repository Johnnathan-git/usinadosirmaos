-- 1. Self-scoped policies on role/permission tables (no helper functions)
DROP POLICY IF EXISTS "read own role" ON public.user_roles;
CREATE POLICY "read own role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "read own perms" ON public.user_permissions;
CREATE POLICY "read own perms" ON public.user_permissions FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "read own client link" ON public.user_clients;
CREATE POLICY "read own client link" ON public.user_clients FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 2. Drop SECURITY DEFINER helpers exposed through the API
DROP FUNCTION IF EXISTS public.has_permission(uuid, text);
DROP FUNCTION IF EXISTS public.is_effective_admin(uuid);
DROP FUNCTION IF EXISTS public.is_bootstrap_mode();
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- 3. Drop permissive public policies
DROP POLICY IF EXISTS "public read clients" ON public.clients;
DROP POLICY IF EXISTS "public write clients" ON public.clients;
DROP POLICY IF EXISTS "public update clients" ON public.clients;
DROP POLICY IF EXISTS "public delete clients" ON public.clients;
DROP POLICY IF EXISTS "public read invoices" ON public.invoices;
DROP POLICY IF EXISTS "public write invoices" ON public.invoices;
DROP POLICY IF EXISTS "public update invoices" ON public.invoices;
DROP POLICY IF EXISTS "public delete invoices" ON public.invoices;
DROP POLICY IF EXISTS "public read expenses" ON public.expenses;
DROP POLICY IF EXISTS "public write expenses" ON public.expenses;
DROP POLICY IF EXISTS "public update expenses" ON public.expenses;
DROP POLICY IF EXISTS "public delete expenses" ON public.expenses;
DROP POLICY IF EXISTS "p_read" ON public.inventory_assets;
DROP POLICY IF EXISTS "p_ins" ON public.inventory_assets;
DROP POLICY IF EXISTS "p_upd" ON public.inventory_assets;
DROP POLICY IF EXISTS "p_del" ON public.inventory_assets;
DROP POLICY IF EXISTS "p_read" ON public.investment_expenses;
DROP POLICY IF EXISTS "p_ins" ON public.investment_expenses;
DROP POLICY IF EXISTS "p_upd" ON public.investment_expenses;
DROP POLICY IF EXISTS "p_del" ON public.investment_expenses;
DROP POLICY IF EXISTS "p_read" ON public.plant_config;
DROP POLICY IF EXISTS "p_ins" ON public.plant_config;
DROP POLICY IF EXISTS "p_upd" ON public.plant_config;
DROP POLICY IF EXISTS "p_del" ON public.plant_config;
DROP POLICY IF EXISTS "p_read" ON public.client_allocations;
DROP POLICY IF EXISTS "p_ins" ON public.client_allocations;
DROP POLICY IF EXISTS "p_upd" ON public.client_allocations;
DROP POLICY IF EXISTS "p_del" ON public.client_allocations;

-- 4. Revoke anonymous access
REVOKE ALL ON public.clients, public.invoices, public.expenses, public.inventory_assets,
  public.investment_expenses, public.plant_config, public.client_allocations FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients, public.invoices, public.expenses,
  public.inventory_assets, public.investment_expenses, public.plant_config,
  public.client_allocations TO authenticated;
GRANT ALL ON public.clients, public.invoices, public.expenses, public.inventory_assets,
  public.investment_expenses, public.plant_config, public.client_allocations TO service_role;

-- 5. Clients: admins full access, linked users read their own client only
CREATE POLICY "clients_select" ON public.clients FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  OR EXISTS (SELECT 1 FROM public.user_clients uc WHERE uc.user_id = auth.uid() AND uc.client_id = clients.id)
);
CREATE POLICY "clients_insert" ON public.clients FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "clients_update" ON public.clients FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "clients_delete" ON public.clients FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- 6. Invoices: admins full access, linked users read their own client's invoices
CREATE POLICY "invoices_select" ON public.invoices FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  OR EXISTS (SELECT 1 FROM public.user_clients uc WHERE uc.user_id = auth.uid() AND uc.client_id = invoices.client_id)
);
CREATE POLICY "invoices_insert" ON public.invoices FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "invoices_update" ON public.invoices FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "invoices_delete" ON public.invoices FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- 7. Operational tables: signed-in read, admin-only writes
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['expenses','inventory_assets','investment_expenses','plant_config','client_allocations']
  LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)', t||'_select', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = ''admin''))', t||'_insert', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = ''admin'')) WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = ''admin''))', t||'_update', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = ''admin''))', t||'_delete', t);
  END LOOP;
END $$;