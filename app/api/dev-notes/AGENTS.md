# app/api/dev-notes/ — Agent overview

## Role
Permissioned CRM BFF endpoints for Dev Notes list/create/update.

## Contents
- `route.ts` — `GET` list, `POST` create
- `[id]/route.ts` — `PATCH` update, `DELETE` remove

## Boundaries
- Delegate validation and data logic to `lib/dev-notes`.
- Auth via `bffRoute` (`devnotes.read` / `devnotes.write`).
