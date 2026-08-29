# lib/sales/ — Agent overview

## Role
Lead pipeline utils, booking-from-lead, agent commission math, and Sales BFF contracts/repository.

## Contents
- `sales-lead-utils.ts`, `booking-from-lead.ts` (re-exports `nextBookingId` from `lib/bookings`), `agents-commission.ts`
- `lead-list-input.ts` — Zod list/patch contracts for BFF
- `lead-repository.ts` — `server-only` list/patch/confirm/approve-outline

## Boundaries
- Store entities remain in `lib/store` / `lib/types`; keep pure sales transforms here.
- HTTP: `app/api/leads`. Browser must not write leads/comms/bookings on `/sales` via hydrate/auto-sync.
