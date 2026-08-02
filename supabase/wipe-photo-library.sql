-- Wipe Photo Library (run in Supabase SQL Editor when starting fresh)
-- Cascades: photo_tags, product_photos, attraction_photos (FK ON DELETE CASCADE).
-- Keeps system folder PF-unsorted. Non-system photo_folders are removed.
-- Storage objects are NOT deleted by SQL — clear bucket "photos" / gallery/* in Dashboard if needed.

-- 1) Inspect
-- select count(*) from photos;
-- select id, caption, url, storage_path, folder_id from photos order by id;

-- 2) Delete all library rows
delete from photos;

-- 3) Remove user-created folders (keep Unsorted)
delete from photo_folders where is_system = false;

-- Optional: only broken-looking rows (filename-style captions)
-- delete from photos
-- where caption ~ '^[a-z0-9]+(-[a-z0-9]+)+-[0-9]+'
--    or url is null
--    or url = '';
