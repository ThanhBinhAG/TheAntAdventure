# components/weather/ — Agent overview

## Role
Weather Guide UI: featured destination cards, explore grid, add/edit destinations, lazy weather detail.

## Contents
- `week/` — featured cards + skeleton + detail modal
- `destinations/` — explore tiles + grid skeleton + add/edit modals
- `hooks/` — `useWeatherPageBoot`, `useDestinationWeather`, `useProvinceList` (alias)
- `icons/` — WMO SVG glyphs
- `weatherLabels.ts` — VN labels / day formatting

## Boundaries
- Catalog + forecast APIs: `app/api/weather`. Domain: `lib/weather`.
- Page shell: `components/pages/Weather.tsx`. No seasonal/region/best-time tabs.
