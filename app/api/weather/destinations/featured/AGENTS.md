# app/api/weather/destinations/featured/ — Agent overview

## Role
Set the (max 2) featured weather destinations in one request.

## Contents
- `route.ts` — PUT `{ ids: string[] }`

## Boundaries
- Domain: `setFeaturedDestinationIds` in `lib/weather/destinations.ts`.
