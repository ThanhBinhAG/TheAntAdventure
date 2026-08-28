-- Backfill storage_path from legacy public Supabase URLs before bucket goes private.

update public.photos
set storage_path = (regexp_match(url, '/storage/v1/object/public/photos/([^?]+)'))[1]
where storage_path is null
  and url ~ '/storage/v1/object/public/photos/gallery/';
