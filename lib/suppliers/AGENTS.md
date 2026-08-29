# lib/suppliers/ — Agent overview

## Role
Supplier filter/tag helpers, seed ensure, and Suppliers BFF Zod/DTO/repositories.

## Contents
- `supplier-utils.ts`, `ensure-supplier-seeds.ts`
- `supplier-errors.ts` — shared repository error
- `hotel-input.ts` / `hotel-repository.ts` — Hotels + nested `hotel_rooms`
- `quicklist-input.ts` / `quicklist-repository.ts` — Transport / Restaurants / Cruises
- `extended-supplier-input.ts` / `extended-supplier-repository.ts` — `suppliers` + tags

## Boundaries
- UI: `components/suppliers`. Server-only repos must not be imported from Client Components.
- Permissions: `suppliers.read` / `suppliers.write` via `bffRoute`.
