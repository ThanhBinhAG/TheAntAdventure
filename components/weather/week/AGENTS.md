# components/weather/week/ — Agent overview

## Role
Featured destination weather cards and detail modal (live Open-Meteo, lazy per id).

## Contents
- `MainWeatherCard.tsx` — large featured card
- `FeaturedWeatherRow.tsx` — row of featured cards
- `FeaturedWeatherSkeleton.tsx` — 2-card shimmer while catalog loads
- `WeatherDetailModal.tsx` — full detail for featured or explore

## Boundaries
- Hooks: `../hooks`. Explore tiles: `../destinations`.
