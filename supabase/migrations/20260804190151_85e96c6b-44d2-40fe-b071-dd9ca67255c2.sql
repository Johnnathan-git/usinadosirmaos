UPDATE public.invoices SET attachment_url = REPLACE(attachment_url, 'arquivos_faturas_v2_private', 'faturas') WHERE attachment_url LIKE '%arquivos_faturas_v2_private%';
UPDATE public.invoices SET attachment_url = REPLACE(attachment_url, 'arquivos_faturas', 'faturas') WHERE attachment_url LIKE '%arquivos_faturas%';
UPDATE public.invoices SET attachment_url = REPLACE(attachment_url, 'arquivos_sistema_v1', 'faturas') WHERE attachment_url LIKE '%arquivos_sistema_v1%';
UPDATE public.invoices SET attachment_url = REPLACE(attachment_url, 'attachments_new_private', 'faturas') WHERE attachment_url LIKE '%attachments_new_private%';
