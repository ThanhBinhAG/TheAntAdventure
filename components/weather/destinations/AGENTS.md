# components/weather/destinations/ — Agent overview

## Role
Explore destination tiles and add/edit destination modals (gallery cover pick).

## Contents
- `ProvinceCard.tsx`, `ProvinceCardGrid.tsx`
- `ProvinceGridSkeleton.tsx` — explore tile shimmer while catalog loads
- `DestinationCoverPlaceholder.tsx` — soft green no-image stand-in
- `AddProvinceModal.tsx`, `EditProvinceModal.tsx` — sectioned forms
- `FeaturedSlotsModal.tsx` — pick up to 2 featured destinations

## Boundaries
- Catalog via `../hooks/useWeatherPageBoot` (page boot).
- Covers: prefer `coverThumbUrl`, lazy `StorageImage` (no full CSS background).
- Prefetch: 200ms hover-intent; immediate on keyboard focus; click still opens detail (in-flight dedupe).
- Max 2 featured enforced in `lib/weather/destinations` + FeaturedSlotsModal.
