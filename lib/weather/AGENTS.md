# lib/weather/ — Agent overview

## Role
Open-Meteo fetch, Supabase cache, ratings, coords, and weather-specific auth/admin helpers.

## Contents
- `open-meteo.ts` — batch forecast + parallel fallback (`mapPool`)
- `refresh.ts` — refresh orchestration; cache-first weekly read (no block when rows exist)
- `cache.ts`, `rating.ts`, `coordinates.ts`, `auth.ts`, `supabase-admin.ts`, `types.ts`

## Boundaries
- UI: `components/weather`. APIs: `app/api/weather`. Prefer global `lib/auth` for non-weather auth.
