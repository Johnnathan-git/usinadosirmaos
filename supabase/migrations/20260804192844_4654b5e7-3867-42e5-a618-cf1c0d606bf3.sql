-- Atualizar os caminhos das faturas para usar o novo bucket se ainda não estiverem corretos
UPDATE public.invoices 
SET attachment_url = REPLACE(attachment_url, 'faturas_private/', '')
WHERE attachment_url IS NOT NULL;

UPDATE public.invoices 
SET attachment_url = REPLACE(attachment_url, 'faturas/', '')
WHERE attachment_url IS NOT NULL;
