# lib/weather/ — Agent overview

## Role
Open-Meteo fetch, Supabase cache, ratings, destination catalog CRUD, and weather auth/admin helpers.

## Contents
- `coordinates.ts` — seed catalog + `FEATURED_WEEKLY_IDS` (Hanoi/Saigon) + region types
- `destinations.ts` — **runtime SSOT** list/CRUD; `ensureDestinationsSeeded` memoized batch upsert
- `boot.ts` — page boot: catalog + featured forecasts only (passes meta into `getDestinationWeather` — no get-by-id N+1)
- `open-meteo.ts` — batch weekly + **single-destination** current/daily (+ UV)
- `refresh.ts` — per-destination cache-first fetch (`string | WeatherDestinationMeta`); cron warms featured only
- `cache.ts` — forecast + `weather_current_cache` helpers
- `client-cache.ts` — browser localStorage per destination (TTL on read/write prune, max 24 keys)
- `rating.ts`, `auth.ts`, `supabase-admin.ts`, `types.ts`

## Adding a destination
Prefer UI **Thêm tỉnh thành** (writes DB). Or seed via `coordinates.ts` then refresh; covers/descriptions set in UI.

## Boundaries
- UI: `components/weather`. APIs: `app/api/weather`.
- Page load: `getWeatherPageBoot` (catalog + max-2 featured weather). Explore weather stays lazy per id.
