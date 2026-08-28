# lib/bookings/ — Agent overview

## Role
Server contracts and repository for Bookings BFF (list/create/update + change log).

## Contents
- `booking-ids.ts` — `nextBookingId` (shared with Sales confirm)
- `booking-dates.ts` — ISO date normalize/display helpers (client + server safe)
- `booking-form.ts` — create-form state + client validation
- `booking-input.ts` — Zod request contracts for create/update
- `booking-repository.ts` — server-only read/write + `booking_changes` sync

## Boundaries
- Browser code calls `/api/bookings`; it must not import the Supabase browser client.
- Sales confirm-lead may call `insertBookingServer` / `listBookingSummariesServer` — do not import `lib/sales` from here.
