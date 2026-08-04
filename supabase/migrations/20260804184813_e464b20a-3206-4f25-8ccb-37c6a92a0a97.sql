
-- Criar políticas de acesso para o novo bucket
CREATE POLICY "Public Read Access" ON storage.objects FOR SELECT TO public USING (bucket_id = 'attachments_new_private');
CREATE POLICY "Auth Upload Access" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'attachments_new_private');
CREATE POLICY "Auth Update Access" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'attachments_new_private');
CREATE POLICY "Auth Delete Access" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'attachments_new_private');
