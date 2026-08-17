# components/gallery/ — Agent overview

## Role
Photo library UI: folder browser, picker, upload, tags, and `StorageImage` for Supabase/public URLs.

## Contents
- `GalleryWorkspace.tsx` — main Gallery CRM screen (folders, upload, DnD, lightbox); page shell is `pages/Gallery.tsx`
- Folder browse/move: `GalleryFolderGrid`, `GalleryFolderBreadcrumb`, `GalleryMovePhotosModal`, `GalleryFolderNameModal`, `GalleryFolderInfoModal`
- `PhotoLibraryPicker.tsx` — modal/inline pick; **All folders** first with Explorer tiles (pickers only; hide Info/Rename/Delete)
- Gallery page keeps classic folder tiles + action buttons; Move uses the list modal
- Picker, upload, tags, lightbox helpers, `StorageImage.tsx`

## Boundaries
- UX helpers: `lib/gallery`. Paths/variants/upload: `lib/storage`. API: `app/api/photos`.
- Logo pick uses `components/sidebar/CompanyLogoGalleryPicker` (same picker tile grid).
- Folder tile CSS: `.phlib-folder-grid` in `app/globals.css`.
- `pages/Gallery.tsx` / `pages/GalleryPage.tsx` stay thin (Suspense + re-export).
