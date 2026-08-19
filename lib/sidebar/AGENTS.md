# lib/sidebar/ — Agent overview

## Role
Server-side sidebar badge counts (Tour Design attention, Planner active tasks).

## Contents
- `badge-counts.ts` — permission-scoped head/count queries for `/api/sidebar/badges`

## Boundaries
- Server-only; client hook lives in `hooks/useSidebarBadges.ts`.
- Permission table mapping stays in `lib/db/sidebar-badge-tables.ts`.
