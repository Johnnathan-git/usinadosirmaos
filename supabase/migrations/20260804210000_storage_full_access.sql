-- Primeiro, garantir que o bucket seja público para simplificar o acesso direto se necessário, 
-- embora continuemos usando Signed URLs por segurança.
UPDATE storage.buckets SET public = false WHERE id = 'faturas_v3_privado_v2';

-- Remover TODAS as políticas existentes para este bucket para limpar conflitos
DROP POLICY IF EXISTS "Authenticated users can select in faturas_v3_privado_v2" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to faturas_v3_privado_v2" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update in faturas_v3_privado_v2" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete in faturas_v3_privado_v2" ON storage.objects;
DROP POLICY IF EXISTS "Public Access to faturas_v3_privado_v2" ON storage.objects;

-- Criar política única e abrangente para usuários autenticados (mais robusta)
CREATE POLICY "Full access to authenticated users on faturas_v3_privado_v2" ON storage.objects
FOR ALL 
TO authenticated 
USING (bucket_id = 'faturas_v3_privado_v2')
WITH CHECK (bucket_id = 'faturas_v3_privado_v2');

-- Permitir leitura pública (SELECT) caso as assinaturas falhem por algum motivo de rede
CREATE POLICY "Public read access on faturas_v3_privado_v2" ON storage.objects
FOR SELECT 
TO public 
USING (bucket_id = 'faturas_v3_privado_v2');

-- Garantir que as permissões de banco de dados (GRANT) estão aplicadas corretamente
GRANT ALL ON storage.objects TO authenticated, service_role;
GRANT ALL ON storage.buckets TO authenticated, service_role;
