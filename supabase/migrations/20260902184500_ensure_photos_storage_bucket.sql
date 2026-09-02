-- Ensure CRM photos Storage bucket exists (gallery, guides, branding uploads).
-- Source: supabase/schema.sql MODULE 14. Idempotent via ON CONFLICT DO UPDATE.
-- Servers that applied migrations without schema.sql MODULE 14 may lack this bucket
-- (upload error: "Bucket not found").

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos',
  'photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists photos_public_read on storage.objects;

drop policy if exists photos_auth_select on storage.objects;
create policy photos_auth_select on storage.objects
  for select to authenticated
  using (bucket_id = 'photos');

drop policy if exists photos_auth_insert on storage.objects;
create policy photos_auth_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos' and (
      (storage.foldername(name))[1] in ('guides', 'gallery', 'branding')
    )
  );

drop policy if exists photos_auth_update on storage.objects;
create policy photos_auth_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'photos' and (
      (storage.foldername(name))[1] in ('guides', 'gallery', 'branding')
    )
  )
  with check (
    bucket_id = 'photos' and (
      (storage.foldername(name))[1] in ('guides', 'gallery', 'branding')
    )
  );

drop policy if exists photos_auth_delete on storage.objects;
create policy photos_auth_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'photos' and (
      (storage.foldername(name))[1] in ('guides', 'gallery', 'branding')
    )
  );

commit;
