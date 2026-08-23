# app/api/customers/email-check — Agent overview

## Role
On-the-fly customer email uniqueness for the Clients form (BFF).

## Contents
- `route.ts` — GET `?email=&excludeId=` → `{ available, existing? }` (`customers.write`)

## Boundaries
- Uses `findDuplicateCustomerEmail` in `lib/customers/customer-repository.ts`.
- Do not rely on the browser Zustand `customers` array for uniqueness after list BFF cutover.
