# lib/seeds/ — Agent overview

## Role
Static seed datasets still used by hydrate/ensure helpers, Tour Design, Weather, proposals, or tests.

## Contents
- `products.ts`, `hotels.ts`, `suppliers.ts`, `extendedSuppliers.ts`, `attractions.ts` — ensure/merge on hydrate
- `weather.ts`, `tourPackages.ts`, `staff.ts`, `taa-tours.ts` — direct app/test imports
- Offline CRM seeds (customers, bookings, …) live in `Personal/legacy-seeds/` (gitignored)

## Boundaries
- Prefer explicit `@/lib/seeds/<file>` imports. Do not reintroduce a catch-all barrel unless needed.
- Do not import from `Personal/legacy-seeds` in app code.
