-- Photo Library migration (existing Supabase projects)
-- Run in SQL Editor after photos table exists.
-- Converts tour-owned photos (product_code/slot) into independent library + product_photos join.

-- ============================================================
-- 1. Junction: product ↔ photo (mirrors attraction_photos)
-- ============================================================

create table if not exists product_photos (
  product_code    text not null references products(code) on delete cascade,
  photo_id        text not null references photos(id) on delete cascade,
  sort_order      smallint default 0,
  is_featured     boolean not null default false,
  primary key (product_code, photo_id)
);

create index if not exists idx_product_photos_photo on product_photos(photo_id);

-- ============================================================
-- 2. Backfill links from photos.product_code / slot
-- ============================================================

insert into product_photos (product_code, photo_id, sort_order, is_featured)
select
  p.product_code,
  p.id,
  case
    when p.slot = 1 then 0
    when p.slot = 2 then 1
    else coalesce(
      (
        select count(*)::smallint
        from photos x
        where x.product_code = p.product_code
          and x.id < p.id
          and (x.slot is null or x.slot not in (1, 2))
      ) + 2,
      2
    )
  end as sort_order,
  (p.slot in (1, 2)) as is_featured
from photos p
where p.product_code is not null
on conflict (product_code, photo_id) do nothing;

-- ============================================================
-- 3. Drop tour ownership columns on photos
-- ============================================================

drop index if exists photos_product_slot_unique;

alter table photos drop column if exists slot;
alter table photos drop column if exists product_code;

-- ============================================================
-- 4. Storage policies: flat gallery/{photoId}/… paths
-- ============================================================

drop policy if exists photos_auth_insert on storage.objects;
create policy photos_auth_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos' and (
      (storage.foldername(name))[1] = 'guides'
      or (storage.foldername(name))[1] = 'gallery'
    )
  );

drop policy if exists photos_auth_update on storage.objects;
create policy photos_auth_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'photos' and (
      (storage.foldername(name))[1] = 'guides'
      or (storage.foldername(name))[1] = 'gallery'
    )
  )
  with check (
    bucket_id = 'photos' and (
      (storage.foldername(name))[1] = 'guides'
      or (storage.foldername(name))[1] = 'gallery'
    )
  );

drop policy if exists photos_auth_delete on storage.objects;
create policy photos_auth_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'photos' and (
      (storage.foldername(name))[1] = 'guides'
      or (storage.foldername(name))[1] = 'gallery'
    )
  );

-- ============================================================
-- 5. RLS: authenticated_access on product_photos
-- ============================================================
-- Enabling RLS without a policy blocks INSERT (error: "new row violates
-- row-level security policy") while SELECT quietly returns zero rows —
-- Tour Product photos appear locally then vanish on refresh.
-- If this migration already ran without the policy below, also run
-- supabase/fix-product-photos-rls.sql (or re-run rls-authenticated.sql).

alter table product_photos enable row level security;
drop policy if exists dev_allow_all on product_photos;
drop policy if exists authenticated_access on product_photos;
create policy authenticated_access on product_photos
  for all to authenticated
  using (true)
  with check (true);
