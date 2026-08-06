ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS public_lighting_value NUMERIC(10, 2) DEFAULT 0;
COMMENT ON COLUMN public.clients.public_lighting_value IS 'Valor padrão da Iluminação Pública para faturas deste cliente.';
