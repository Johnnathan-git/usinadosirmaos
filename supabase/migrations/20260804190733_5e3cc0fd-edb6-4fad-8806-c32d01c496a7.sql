-- Storage policies for the 'faturas_private' bucket
DROP POLICY IF EXISTS "Authenticated Access" ON storage.objects;
CREATE POLICY "Authenticated Access" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'faturas_private');

DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'faturas_private');

DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
CREATE POLICY "Authenticated Update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'faturas_private');

DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;
CREATE POLICY "Authenticated Delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'faturas_private');
