-- Adicionar coluna de desconto na tabela de clientes
ALTER TABLE public.clients ADD COLUMN discount_pct NUMERIC DEFAULT 30;

-- Atualizar o comentário da coluna
COMMENT ON COLUMN public.clients.discount_pct IS 'Porcentagem de desconto aplicada ao cliente (padrão 30%)';

-- Recarregar o esquema para refletir a mudança no PostgREST
NOTIFY pgrst, 'reload schema';
