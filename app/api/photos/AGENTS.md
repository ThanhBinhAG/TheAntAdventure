# app/api/photos/ — Agent overview

## Role
Server endpoints for gallery photo upload and delete (Supabase Storage + DB links).

## Contents
- `upload/init|chunk|complete/` — chunked upload → Sharp child → WebP variants → Storage
- `delete/route.ts` — remove Storage objects + DB row

## Boundaries
- Session + Sharp: `lib/image-pipeline`. Persist: `lib/storage/upload-gallery-photo-server.ts`.
- Per-user hourly quota on `init` (`lib/storage/gallery-upload-rate-limit.ts`).
