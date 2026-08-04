DO $$
BEGIN
    DROP POLICY IF EXISTS "faturas_select" ON storage.objects;
    CREATE POLICY "faturas_select" ON storage.objects FOR SELECT USING (bucket_id = 'faturas');

    DROP POLICY IF EXISTS "faturas_insert" ON storage.objects;
    CREATE POLICY "faturas_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'faturas');

    DROP POLICY IF EXISTS "faturas_update" ON storage.objects;
    CREATE POLICY "faturas_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'faturas');

    DROP POLICY IF EXISTS "faturas_delete" ON storage.objects;
    CREATE POLICY "faturas_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'faturas');
END $$;
