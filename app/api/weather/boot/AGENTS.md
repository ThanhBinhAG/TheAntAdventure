# app/api/weather/boot/ — Agent overview

## Role
Single Weather page boot: destination catalog + featured forecasts only.

## Contents
- `route.ts` — GET `{ destinations, featuredWeather }`

## Boundaries
- Orchestration: `lib/weather/boot.ts`. Explore weather stays on `destination/?id=`.
