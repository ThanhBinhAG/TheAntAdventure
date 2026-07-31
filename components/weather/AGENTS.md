# components/weather/ — Agent overview

## Role
Weather Guide UI: destination cards with 7-day strips, seasonal heat strips, legend, region chips, skeleton, session cache.

## Contents
- `WeatherWeeklyGrid.tsx` — live week cards (comfort sort, highlights, cache-first fetch)
- `WeatherWeeklySkeleton.tsx` — card skeleton
- `WeatherLegend.tsx`, `WeatherRegionChips.tsx` — chrome
- `weatherClientCache.ts` — sessionStorage weekly payload
- `weatherUiHelpers.ts` — comfort score, day labels, glyphs

## Boundaries
- Open-Meteo/cache/rating: `lib/weather`. APIs: `app/api/weather`.
- Page shell + seasonal tabs: `components/pages/Weather.tsx`.
