
-- Remover qualquer política anterior para evitar conflitos se houver re-execução
DROP POLICY IF EXISTS "Acesso Leitura Público" ON storage.objects;
DROP POLICY IF EXISTS "Upload Autenticado" ON storage.objects;
DROP POLICY IF EXISTS "Update Autenticado" ON storage.objects;
DROP POLICY IF EXISTS "Delete Autenticado" ON storage.objects;

-- Criar políticas de acesso para o novo bucket 'arquivos_faturas'
CREATE POLICY "Acesso Leitura Público" ON storage.objects FOR SELECT TO public USING (bucket_id = 'arquivos_faturas');
CREATE POLICY "Upload Autenticado" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'arquivos_faturas');
CREATE POLICY "Update Autenticado" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'arquivos_faturas');
CREATE POLICY "Delete Autenticado" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'arquivos_faturas');
