# app/api/weather/destination/ — Agent overview

## Role
Lazy single-destination forecast read + force refresh.

## Contents
- `route.ts` — GET `?id=`
- `refresh/route.ts` — POST `{ id, force? }`

## Boundaries
- Orchestration: `lib/weather/refresh.ts`. Do not batch-fetch all destinations here.
