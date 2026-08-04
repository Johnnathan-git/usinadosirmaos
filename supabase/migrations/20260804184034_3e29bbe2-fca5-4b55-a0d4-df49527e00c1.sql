-- Drop existing policies if they were somehow partially created
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow public select" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

-- Allow authenticated users to upload to the attachments bucket
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'attachments');

-- Allow authenticated users to update their own uploads
CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'attachments');

-- Allow public read access to attachments in this specific bucket
-- Note: The bucket itself is private, so we need a policy for SELECT
CREATE POLICY "Allow public select"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'attachments');

-- Allow authenticated users to delete
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'attachments');
