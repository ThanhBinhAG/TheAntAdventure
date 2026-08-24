# app/api/photos/ — Agent overview

## Role
Server endpoints for gallery photo list/metadata, folders, upload and delete (Supabase Storage + DB links).

## Contents
- `route.ts` — paginated `GET /api/photos` (`gallery.read`)
- `[id]/route.ts` — `PATCH` photo metadata (`gallery.write`)
- `all/route.ts` — read-all for cross-feature pickers
- `upload/init|chunk|complete/` — chunked upload → Sharp child → WebP variants → Storage (`gallery.write`)
- `delete/route.ts` — remove Storage objects + DB row
- See also [`../photo-folders/`](../photo-folders/) for folder CRUD

## Boundaries
- Session + Sharp: `lib/image-pipeline`. Persist: `lib/storage/upload-gallery-photo-server.ts`.
- Per-user hourly quota on `init` (`lib/storage/gallery-upload-rate-limit.ts`).
