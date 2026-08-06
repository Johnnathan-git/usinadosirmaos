
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Permitir upload para autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir leitura para autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir delete para autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir update para autenticados" ON storage.objects;

-- Create robust policies for storage.objects
CREATE POLICY "Permitir upload para autenticados"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'faturas_v3_privado_v2');

CREATE POLICY "Permitir leitura para autenticados"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'faturas_v3_privado_v2');

CREATE POLICY "Permitir delete para autenticados"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'faturas_v3_privado_v2');

CREATE POLICY "Permitir update para autenticados"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'faturas_v3_privado_v2');
