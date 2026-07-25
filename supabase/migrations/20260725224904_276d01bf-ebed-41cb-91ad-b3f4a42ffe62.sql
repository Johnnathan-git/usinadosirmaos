
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated, anon;
GRANT ALL ON public.clients TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated, anon;
GRANT ALL ON public.invoices TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated, anon;
GRANT ALL ON public.expenses TO service_role;
