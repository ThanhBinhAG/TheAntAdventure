# app/api/bookings/ — Agent overview

## Role
Permissioned CRM BFF endpoints for Bookings list/create/update.

## Contents
- `route.ts` — `GET` list, `POST` create
- `[id]/route.ts` — `GET` one, `PATCH` update

## Boundaries
- Delegate validation and data logic to `lib/bookings`.
- Auth/permissions via `bffRoute` (`bookings.read` / `bookings.write`).
