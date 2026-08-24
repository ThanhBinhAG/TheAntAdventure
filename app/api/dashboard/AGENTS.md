# app/api/dashboard/ — Agent overview

## Role
Aggregate Dashboard BFF: KPIs, charts, forecast deals, agent pipeline, NPS.

## Contents
- `route.ts` — GET filtered dashboard DTO (`dashboard.read`)

## Boundaries
- Domain: `lib/dashboard`. No browser Supabase hydrate on `/dashboard`.
- Currency FX stays client-side; filters `clientType` / `market` are query params.
