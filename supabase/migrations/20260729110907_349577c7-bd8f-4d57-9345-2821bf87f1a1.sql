CREATE TABLE public.user_clients (
  user_id uuid PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_clients TO authenticated;
GRANT ALL ON public.user_clients TO service_role;
ALTER TABLE public.user_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own client link" ON public.user_clients FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_effective_admin(auth.uid()));