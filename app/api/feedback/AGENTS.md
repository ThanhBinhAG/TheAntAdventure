# app/api/feedback/ — Agent overview

## Role
Permissioned CRM BFF endpoints for Post-tour feedback list/create.

## Contents
- `route.ts` — `GET` list, `POST` create
- `[id]/route.ts` — `GET` one

## Boundaries
- Delegate validation and data logic to `lib/feedback`.
- Auth/permissions via `bffRoute` (`posttour.read` / `posttour.write`).
