# lib/weather/ — Agent overview

## Role
Open-Meteo fetch, cache, ratings, coords, and weather-specific auth/admin helpers.

## Contents
- `open-meteo.ts`, `refresh.ts`, `rating.ts`, `cache.ts`, `coordinates.ts`, …

## Boundaries
- UI: `components/weather`. APIs: `app/api/weather`. Prefer global `lib/auth` for non-weather auth.
