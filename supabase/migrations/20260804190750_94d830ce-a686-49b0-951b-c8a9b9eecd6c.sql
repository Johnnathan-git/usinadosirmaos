GRANT SELECT ON public.invoices TO authenticated;
GRANT SELECT ON public.invoices TO anon;
GRANT SELECT ON public.invoices TO service_role;

GRANT SELECT ON public.clients TO authenticated;
GRANT SELECT ON public.clients TO anon;
GRANT SELECT ON public.clients TO service_role;
