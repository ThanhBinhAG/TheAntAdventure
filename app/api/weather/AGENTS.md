# app/api/weather/ — Agent overview

## Role
Weather destination catalog CRUD and lazy per-destination Open-Meteo forecasts.

## Contents
- `boot/route.ts` — GET page boot (`destinations` + `featuredWeather`)
- `destinations/route.ts` — GET list / POST create
- `destinations/[id]/route.ts` — PATCH update / DELETE soft-deactivate
- `destinations/featured/route.ts` — PUT set max-2 featured ids
- `destination/route.ts` — GET cache-first single destination (current + 7-day)
- `destination/refresh/route.ts` — POST force refresh one destination
- `refresh/route.ts` — POST warm featured destinations (cron)
- `weekly/route.ts` — deprecated (410)

## Boundaries
- Fetch/cache/rating/CRUD logic: `lib/weather`.
- Page paint uses `boot/`; explore/detail still `destination/?id=`.
