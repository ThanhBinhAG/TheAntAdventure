# lib/weather/ — Agent overview

## Role
Open-Meteo fetch, Supabase cache, ratings, destination catalog, and weather-specific auth/admin helpers.

## Contents
- `coordinates.ts` — **SSOT** `WEATHER_DESTINATIONS` + `FEATURED_WEEKLY_IDS` (Hanoi/Saigon)
- `open-meteo.ts` — batch forecast + parallel fallback (`mapPool`)
- `refresh.ts` — refresh orchestration; cache-first weekly read
- `cache.ts`, `rating.ts`, `auth.ts`, `supabase-admin.ts`, `types.ts`

## Adding a destination
1. Add one row to `WEATHER_DESTINATIONS` (id, name, region, emoji, lat, lon, sortOrder).
2. Add `DEFAULT_WEATHER[id]` + `TEMP_RANGES[id]` in `lib/seeds/weather.ts` (UI falls back to all-G / no temps if missing).
3. Optionally `BEST_BY[id]` for Best Time; optionally add id to `FEATURED_WEEKLY_IDS`.
4. Next `POST /api/weather/refresh` (or cron) upserts DB + forecast cache.

## Boundaries
- UI: `components/weather`. APIs: `app/api/weather`. Prefer global `lib/auth` for non-weather auth.
- Do not duplicate destination lists in seeds — `DESTINATIONS` there is derived from this catalog.
