-- Remover políticas antigas para evitar conflitos se necessário
DROP POLICY IF EXISTS "Public Access to faturas_private" ON storage.objects;
DROP POLICY IF EXISTS "Public Access to faturas_v3_privado" ON storage.objects;

-- Criar nova política para o novo bucket v3
CREATE POLICY "Public Access to faturas_v3_privado" ON storage.objects 
FOR SELECT TO public USING (bucket_id = 'faturas_v3_privado');

-- Política para permitir upload por usuários autenticados
CREATE POLICY "Authenticated users can upload to faturas_v3_privado" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'faturas_v3_privado');

-- Garantir privilégios
GRANT SELECT, INSERT ON storage.objects TO anon, authenticated;
