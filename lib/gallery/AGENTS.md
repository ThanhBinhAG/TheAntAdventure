# lib/gallery/ — Agent overview

## Role
Gallery photo UX logic: folders, tags, loose save, API client helpers, tour photo resolution, link selection.

## Contents
- `photo-folders.ts` — nested folder helpers + Unsorted system id
- `gallery-helpers.ts`, `gallery-loose-save.ts`, `photo-api.ts` (chunked upload client),
  `tour-photos.ts`, `gallery-tags.ts`, `photo-link-selection.ts`, …

## Boundaries
- Storage paths/limits/rate-limit: `lib/storage`. Server Sharp: `lib/image-pipeline`.
  UI: `components/gallery`. API: `app/api/photos/upload/*`.
- `photo-api.ts` orchestrates init → chunk → complete; no client-side resize.
