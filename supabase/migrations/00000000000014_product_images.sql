-- SPEC-004 (extensão) — imagens de produto em Storage.
-- Espelha o bucket de avatares (00000000000012), mas a pasta raiz é o
-- organization_id: só membros ativos da org podem escrever; leitura pública.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5 * 1024 * 1024,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "product_images_public_read"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "product_images_insert_member"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] in (select o::text from public.auth_org_ids() o)
  );

create policy "product_images_update_member"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] in (select o::text from public.auth_org_ids() o)
  );

create policy "product_images_delete_member"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] in (select o::text from public.auth_org_ids() o)
  );
