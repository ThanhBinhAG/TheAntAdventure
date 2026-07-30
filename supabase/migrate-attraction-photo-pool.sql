-- Attraction photo pool migration (existing Supabase projects)
-- Run in SQL Editor after attraction_photos table exists.

alter table attraction_photos
  add column if not exists is_featured boolean not null default false;

-- Existing links were display-only; treat them all as featured.
update attraction_photos set is_featured = true where is_featured = false;
