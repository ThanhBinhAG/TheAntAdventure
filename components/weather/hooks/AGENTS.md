# components/weather/hooks/ — Agent overview

## Role
Client hooks for destination catalog CRUD and lazy weather fetch + localStorage cache.

## Contents
- `useWeatherPageBoot.ts` — one boot fetch (catalog + featured); CRUD; seed localStorage
- `useDestinationWeather.ts` — per-id forecast (24h localStorage, in-flight dedupe); `prefetchDestinationWeather` for hover intent
- `useProvinceList.ts` — thin re-export of boot hook + `ProvinceFormInput`
- `useResolvedCover.ts` — cover URL from gallery store by `coverPhotoId` (via `lib/weather/resolve-cover.ts`)

## Boundaries
- Cache helpers: `lib/weather/client-cache.ts`. APIs: `app/api/weather`.
- Boot seeds featured cache so featured cards avoid extra `/destination` GETs.
