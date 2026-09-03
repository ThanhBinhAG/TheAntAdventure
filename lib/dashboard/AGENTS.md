# lib/dashboard/ — Agent overview

## Role
Aggregate pipeline/revenue metrics for the dashboard (pure compute + BFF repository).

## Contents
- `dashboard-metrics.ts` — pure aggregations (client TypeScript-safe; called from server repo); Realized includes filtered customer `revenue`
- `dashboard-input.ts` — Zod query (`clientType`, `market`)
- `dashboard-types.ts` — BFF response DTO (no raw table dumps)
- `dashboard-repository.ts` — `server-only` load + Redis cache-aside + `invalidateDashboardCache`

## Boundaries
- Presentation: `components/dashboard`. HTTP: `app/api/dashboard`.
- Currency FX stays in the UI; filters hit the API.
