-- Photo Storage migration (existing Supabase projects)
-- Run in SQL Editor after photos table exists.
-- Prerequisites: authenticated users for upload (see rls-authenticated.sql).

-- ============================================================
-- 1. Extend photos table
-- ============================================================

alter table photos add column if not exists thumb_url text;
alter table photos add column if not exists storage_path text;

-- ============================================================
-- 2. Storage bucket (public gallery images)
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos',
  'photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ============================================================
-- 3. Storage RLS policies
-- ============================================================

-- Public read for all objects in photos bucket
drop policy if exists photos_public_read on storage.objects;
create policy photos_public_read on storage.objects
  for select to public
  using (bucket_id = 'photos');

-- Authenticated users: upload gallery and guide images
drop policy if exists photos_auth_insert on storage.objects;
create policy photos_auth_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos' and (
      -- Guide avatars
      (storage.foldername(name))[1] = 'guides'
      or (
        -- Owner-grouped gallery paths
        (storage.foldername(name))[1] = 'gallery'
        and (storage.foldername(name))[2] in ('tours', 'attractions', 'loose')
      )
    )
  );

-- Authenticated users: update own bucket paths
drop policy if exists photos_auth_update on storage.objects;
create policy photos_auth_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'photos' and (
      (storage.foldername(name))[1] = 'guides'
      or (
        (storage.foldername(name))[1] = 'gallery'
        and (storage.foldername(name))[2] in ('tours', 'attractions', 'loose')
      )
    )
  )
  with check (
    bucket_id = 'photos' and (
      (storage.foldername(name))[1] = 'guides'
      or (
        (storage.foldername(name))[1] = 'gallery'
        and (storage.foldername(name))[2] in ('tours', 'attractions', 'loose')
      )
    )
  );

-- Authenticated users: delete gallery and guide images
drop policy if exists photos_auth_delete on storage.objects;
create policy photos_auth_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'photos' and (
      (storage.foldername(name))[1] = 'guides'
      or (
        (storage.foldername(name))[1] = 'gallery'
        and (storage.foldername(name))[2] in ('tours', 'attractions', 'loose')
      )
    )
  );
