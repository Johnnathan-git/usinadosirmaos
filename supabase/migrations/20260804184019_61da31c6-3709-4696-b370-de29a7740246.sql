-- Allow authenticated users to upload to the attachments bucket
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'attachments');

-- Allow authenticated users to update their own uploads (optional, but good for retries)
CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'attachments');

-- Allow public access to read attachments (since the bucket is public and used for reports)
CREATE POLICY "Allow public select"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'attachments');

-- Allow authenticated users to delete (optional)
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'attachments');
