# lib/storage/ — Agent overview

## Role
Supabase photo path helpers, gallery persist layer, avatar/logo uploads.

## Contents
- `photo-limits.ts` — MIME, chunk size, display/thumb edges, worker timeout + concurrency,
  per-user rate-limit quota (no hard per-file byte cap)
- `gallery-upload-rate-limit.ts` — per-user hourly upload quota in Redis (RAM fallback if Redis is unavailable)
- `gallery-upload-meta.ts` — Zod meta shared by upload routes
- `upload-gallery-photo-server.ts` — Sharp orchestration + `persistGalleryPhotoRow` (`photos` + `photo_tags`)
- `photo-paths.ts` — `gallery/{photoId}/{display,thumb}.webp` + logo/avatar paths
- `photo-variants.ts` — **avatar only** (`avatarImageFileSchema`, 20 MB cap)
- `upload-company-logo.ts` — server-only branding object persistence
- `company-logo-client.ts` — browser GET/POST/DELETE for branding logo; in-flight
  dedupe + module cache + localStorage last-known URL (Sidebar reads cache via
  `useSyncExternalStore` so SSR/hydration match; then session GET once)

## Boundaries
- Chunk sessions + Sharp worker: `lib/image-pipeline`. Gallery client: `lib/gallery/photo-api.ts`.
- UI image component: `components/gallery/StorageImage`.
- Guide avatars: `lib/guides` + `app/api/guides/avatar`; browser uses the CRM BFF.
- Sidebar logo UI: `components/Sidebar` + `components/sidebar` (use `company-logo-client`).
