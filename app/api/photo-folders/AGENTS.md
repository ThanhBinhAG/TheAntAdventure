# app/api/photo-folders — Agent overview

## Role
CRM BFF for gallery folder tree: list, create, rename, delete.

## Contents
- `route.ts` — GET list (`gallery.read`), POST create (`gallery.write`)
- `[id]/route.ts` — PATCH rename, DELETE empty folder (`gallery.write`)

## Boundaries
- Domain logic: `lib/gallery/photo-repository.ts` + Zod in `gallery-list-input.ts`.
- System folder `PF-unsorted` cannot be renamed or deleted server-side.
