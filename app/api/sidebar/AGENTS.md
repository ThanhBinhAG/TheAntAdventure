# app/api/sidebar/ — Agent overview

## Role
Lightweight sidebar badge counts for CRM nav (no full-table hydrate).

## Contents
- `badges/route.ts` — GET `{ tourDesignAttention?, activeTasks? }`

## Boundaries
- Count logic: `lib/sidebar/badge-counts.ts`. Permission scope: `lib/db/sidebar-badge-tables.ts`.
