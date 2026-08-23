# app/api/customers/[id]/profile — Agent overview

## Role
BFF endpoint for Clients profile modal related rows (leads, comms, bookings, feedback).

## Contents
- `route.ts` — GET profile context for one customer id

## Boundaries
- Domain logic: `lib/customers/customer-repository.ts` (`getCustomerProfileContext`).
- Requires `customers.read`. No browser PostgREST for these tables on `/customers`.
