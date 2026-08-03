# components/weather/ — Agent overview

## Role
Weather Guide UI for all four tabs: live weekly forecasts, seasonal ratings, region compare, best-time calendar.

## Contents
- `WeatherWeeklyGrid.tsx` — This Week: Hanoi/Saigon featured + compact cards; click expands 7-day from cache
- `WeatherWeeklySkeleton.tsx` — featured + compact skeleton
- `WeatherSeasonalPanel.tsx` — year heat strips grouped by region (editable)
- `WeatherRegionPanel.tsx` — North/Central/South compare panels
- `WeatherBestTimePanel.tsx` — 12-month peak destination calendar
- `WeatherRatingEditModal.tsx` — E/G/F/P month editor
- `WeatherLegend.tsx`, `WeatherRegionChips.tsx` — chrome
- `weatherClientCache.ts` — sessionStorage weekly payload
- `weatherUiHelpers.ts` — comfort score, day labels, glyphs

## Boundaries
- Destination catalog SSOT: `WEATHER_DESTINATIONS` in `lib/weather/coordinates` (not a second list in seeds).
- Seasonal maps: `lib/seeds/weather` (`DEFAULT_WEATHER`, `TEMP_RANGES`, `BEST_BY`).
- Open-Meteo/cache/rating: `lib/weather`. APIs: `app/api/weather`.
- Page shell: `components/pages/Weather.tsx`.
