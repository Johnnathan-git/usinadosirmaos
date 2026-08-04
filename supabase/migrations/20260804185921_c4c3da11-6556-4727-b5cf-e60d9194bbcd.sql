-- Permitir que usuários autenticados façam tudo no bucket arquivos_sistema_v1
DO $$
BEGIN
    DROP POLICY IF EXISTS "Permitir upload para usuários autenticados" ON storage.objects;
    CREATE POLICY "Permitir upload para usuários autenticados"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'arquivos_sistema_v1');

    DROP POLICY IF EXISTS "Permitir leitura para todos" ON storage.objects;
    CREATE POLICY "Permitir leitura para todos"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'arquivos_sistema_v1');

    DROP POLICY IF EXISTS "Permitir atualização para usuários autenticados" ON storage.objects;
    CREATE POLICY "Permitir atualização para usuários autenticados"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'arquivos_sistema_v1');

    DROP POLICY IF EXISTS "Permitir exclusão para usuários autenticados" ON storage.objects;
    CREATE POLICY "Permitir exclusão para usuários autenticados"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'arquivos_sistema_v1');
END $$;
