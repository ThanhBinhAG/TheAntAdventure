-- Private photos bucket: authenticated read only; CRM BFF serves bytes via service role.

update storage.buckets
set public = false
where id = 'photos';

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
