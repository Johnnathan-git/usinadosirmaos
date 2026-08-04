
-- Remover políticas anteriores para evitar conflitos
DROP POLICY IF EXISTS "Public Read Access v2" ON storage.objects;
DROP POLICY IF EXISTS "Auth Upload Access v2" ON storage.objects;

-- Criar políticas de acesso para o novo bucket 'arquivos_faturas_v2_private'
CREATE POLICY "Public Read Access v2" ON storage.objects FOR SELECT TO public USING (bucket_id = 'arquivos_faturas_v2_private');
CREATE POLICY "Auth Upload Access v2" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'arquivos_faturas_v2_private');
CREATE POLICY "Auth Update Access v2" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'arquivos_faturas_v2_private');
CREATE POLICY "Auth Delete Access v2" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'arquivos_faturas_v2_private');
