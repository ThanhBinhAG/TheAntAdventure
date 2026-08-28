# app/api/hotels/ — Agent overview

## Role
Permissioned CRM BFF for Hotels (+ nested hotel_rooms).

## Contents
- `route.ts` — `GET` list, `POST` create
- `[id]/route.ts` — `GET` / `PATCH` / `DELETE`

## Boundaries
- Logic in `lib/suppliers/hotel-*`. Auth via `suppliers.read` / `suppliers.write`.
