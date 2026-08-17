# lib/image-pipeline/ — Agent overview

## Role
Server-side Sharp gallery pipeline: chunked upload sessions, forked worker, bounded concurrency.
Storage writes and `photos` rows stay in `lib/storage/upload-gallery-photo-server.ts`.

## Contents
- `limits.ts` — re-exports gallery limits from `lib/storage/photo-limits.ts`
- `profiles.ts` — `GALLERY_SIZE_PROFILES`, `pickGalleryProfile`, `galleryVariantChain`
- `concurrency.ts` — `sharpWorkerGate` (Semaphore from `lib/system/semaphore`)
- `sharp-worker.cjs` — forked worker (knip entry; loaded via runtime path)
- `process.ts` — `processGalleryAssetFromPath` fork wrapper + timeout
- `mime.ts` — JPEG/PNG/WebP sniff from header bytes
- `upload-session.ts` — temp-disk chunk sessions for client uploads

## Boundaries
- Gallery client orchestration: `lib/gallery/photo-api.ts`. Routes: `app/api/photos/upload/*`.
- Do not add a second Sharp worker or duplicate limits here.
- PDF Chromium concurrency: `lib/system/pdf-concurrency` (`pdfBrowserGate`), not this folder.
