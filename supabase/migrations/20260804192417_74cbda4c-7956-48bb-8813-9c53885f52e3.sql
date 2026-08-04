DROP POLICY IF EXISTS "Public Access to faturas_private" ON storage.objects;
CREATE POLICY "Public Access to faturas_private" ON storage.objects 
FOR SELECT TO public USING (bucket_id = 'faturas_private');

GRANT SELECT ON storage.objects TO anon, authenticated;
