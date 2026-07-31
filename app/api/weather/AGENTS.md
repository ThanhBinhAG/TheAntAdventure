# app/api/weather/ — Agent overview

## Role
Weather weekly cache read and refresh endpoints (Open-Meteo).

## Contents
- `weekly/route.ts` — cache-first GET (no Open-Meteo block when rows exist)
- `refresh/route.ts` — manual / cron POST refresh

## Boundaries
- Fetch/cache/rating logic: `lib/weather`.
