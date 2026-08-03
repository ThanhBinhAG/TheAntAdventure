# components/gallery/ — Agent overview

## Role
Photo library UI: folder browser, picker, upload, tags, and `StorageImage` for Supabase/public URLs.

## Contents
- Folder browse/move: `GalleryFolderGrid`, `GalleryFolderBreadcrumb`, `GalleryMovePhotosModal`, `GalleryFolderNameModal`, `GalleryFolderInfoModal`
- Picker, upload, tags, lightbox helpers, `StorageImage.tsx`

## Boundaries
- UX helpers: `lib/gallery`. Paths/variants/upload: `lib/storage`. API: `app/api/photos`.
