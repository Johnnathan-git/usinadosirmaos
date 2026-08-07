
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='storage' AND tablename='objects' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', p.policyname);
  END LOOP;
END $$;

-- Bucket ativo: leitura por admin ou pelo cliente vinculado (pasta = client_id)
CREATE POLICY "faturas_v2_select_owner_or_admin"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'faturas_v3_privado_v2'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.user_clients uc
      WHERE uc.user_id = auth.uid()
        AND uc.client_id::text = ANY (storage.foldername(name))
    )
  )
);

CREATE POLICY "faturas_v2_insert_admin"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'faturas_v3_privado_v2' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "faturas_v2_update_admin"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'faturas_v3_privado_v2' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'faturas_v3_privado_v2' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "faturas_v2_delete_admin"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'faturas_v3_privado_v2' AND public.has_role(auth.uid(), 'admin'));

-- Buckets legados: somente administradores (migração/limpeza), sem acesso público
CREATE POLICY "legacy_buckets_admin_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id IN ('attachments','attachments_new_private','arquivos_faturas','arquivos_faturas_v2_private','arquivos_sistema_v1','faturas','faturas_private','faturas_v3_privado')
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "legacy_buckets_admin_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id IN ('attachments','attachments_new_private','arquivos_faturas','arquivos_faturas_v2_private','arquivos_sistema_v1','faturas','faturas_private','faturas_v3_privado')
  AND public.has_role(auth.uid(), 'admin')
);
