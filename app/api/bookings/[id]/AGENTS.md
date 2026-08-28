# app/api/bookings/[id]/ — Agent overview

## Role
Single-booking CRM BFF (`GET` / `PATCH`).

## Contents
- `route.ts` — read one booking; update booking + change log

## Boundaries
- Object access relies on user-scoped Supabase RLS; missing rows → 404.
