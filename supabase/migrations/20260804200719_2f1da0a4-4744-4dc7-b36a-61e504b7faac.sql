-- Create policies for faturas_v3_privado_v2
CREATE POLICY "Authenticated users can upload to faturas_v3_privado_v2"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'faturas_v3_privado_v2');

CREATE POLICY "Authenticated users can update in faturas_v3_privado_v2"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'faturas_v3_privado_v2');

CREATE POLICY "Authenticated users can select from faturas_v3_privado_v2"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'faturas_v3_privado_v2');

CREATE POLICY "Authenticated users can delete from faturas_v3_privado_v2"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'faturas_v3_privado_v2');
