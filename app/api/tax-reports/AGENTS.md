# app/api/tax-reports/ — Agent overview

## Role
Permissioned CRM BFF endpoints for Tax Reports read and CSV export.

## Contents
- `route.ts` — `GET` list with optional `?period=`
- `export/route.ts` — `GET` CSV download (`tax.write`)

## Boundaries
- Delegate to `lib/tax`.
- Auth via `bffRoute` (`tax.read` / `tax.write`).
