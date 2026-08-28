# app/api/suppliers/ — Agent overview

## Role
Permissioned CRM BFF for extended / special suppliers (`suppliers` + `supplier_tags`).

## Contents
- `route.ts` — `GET` / `POST`
- `[id]/route.ts` — `GET` / `PATCH` / `DELETE`

## Boundaries
- Logic in `lib/suppliers/extended-supplier-*`. Auth via `suppliers.read` / `suppliers.write`.
- Not a generic raw-row dump — DTO via `rowToSupplier`.
