# app/api/weather/destination/refresh/ — Agent overview

## Role
Force-refresh Open-Meteo cache for one destination.

## Contents
- `route.ts` — POST `{ id, force? }`

## Boundaries
- Orchestration: `lib/weather/refresh.ts`.
