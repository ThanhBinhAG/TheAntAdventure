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
- `upload-guide-avatar.ts`, `upload-company-logo.ts`
- `company-logo-client.ts` — browser GET/POST/DELETE for branding logo; in-flight
  dedupe + module cache + localStorage last-known URL (sync Sidebar paint, no default
  SVG flash); session revalidate still hits GET once

## Boundaries
- Chunk sessions + Sharp worker: `lib/image-pipeline`. Gallery client: `lib/gallery/photo-api.ts`.
- UI image component: `components/gallery/StorageImage`.
- Sidebar logo UI: `components/Sidebar` + `components/sidebar` (use `company-logo-client`).
