# app/api/transport/ — Agent overview

## Role
Permissioned CRM BFF for transport suppliers.

## Contents
- `route.ts` — `GET` / `POST`
- `[id]/route.ts` — `GET` / `PATCH` / `DELETE`

## Boundaries
- Logic in `lib/suppliers/quicklist-*`. Auth via `suppliers.read` / `suppliers.write`.
