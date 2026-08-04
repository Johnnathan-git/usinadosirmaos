-- Remove full URL prefixes from attachment_url if they exist, leaving only the path
UPDATE public.invoices
SET attachment_url = regexp_replace(attachment_url, '^https?://[^/]+/storage/v1/object/public/[^/]+/', '')
WHERE attachment_url LIKE 'http%';
