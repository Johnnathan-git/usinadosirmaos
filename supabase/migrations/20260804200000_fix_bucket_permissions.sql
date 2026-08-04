-- Garantir que o bucket existe
INSERT INTO storage.buckets (id, name, public) 
VALUES ('faturas_v3_privado_v2', 'faturas_v3_privado_v2', false)
ON CONFLICT (id) DO NOTHING;

-- Remover políticas antigas para o bucket v2 se existirem
DROP POLICY IF EXISTS "Public Access to faturas_v3_privado_v2" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to faturas_v3_privado_v2" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update in faturas_v3_privado_v2" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete in faturas_v3_privado_v2" ON storage.objects;

-- Política de SELECT para usuários autenticados (ou público se preferir, mas como usamos signed URLs, autenticado é melhor)
CREATE POLICY "Authenticated users can select in faturas_v3_privado_v2" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'faturas_v3_privado_v2');

-- Política de INSERT para permitir upload
CREATE POLICY "Authenticated users can upload to faturas_v3_privado_v2" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'faturas_v3_privado_v2');

-- Política de UPDATE para permitir substituição (upsert)
CREATE POLICY "Authenticated users can update in faturas_v3_privado_v2" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'faturas_v3_privado_v2');

-- Política de DELETE para permitir limpeza
CREATE POLICY "Authenticated users can delete in faturas_v3_privado_v2" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'faturas_v3_privado_v2');

-- Garantir privilégios na tabela de objetos para o serviço de API
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;
