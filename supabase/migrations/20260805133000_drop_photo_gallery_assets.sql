-- Consolidate the two photo pipelines onto the `photos` table.
--
-- `photo_gallery_assets` (added in 20260805060000) never gained a consumer: `photos` is
-- referenced by photo_tags, product_photos, attraction_photos and
-- weather_destinations.cover_photo_id, so it stays the single source of truth and the
-- parallel table is dropped. Both upload paths (browser resize and the Sharp worker
-- fallback) now write the same two variants under gallery/{id}/ — display + thumb — so no
-- new column is needed.

drop table if exists public.photo_gallery_assets;
