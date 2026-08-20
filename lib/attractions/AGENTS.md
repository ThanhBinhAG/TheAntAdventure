# lib/attractions/ — Agent overview

## Role
Attraction display helpers and seed merge into the store.

## Contents
- `attractions-helpers.ts`, `ensure-attraction-seeds.ts`
- `attraction-repository.ts` — Server-only repository for Supabase CRUD on attractions and photos junction.

## Boundaries
- UI: `components/attractions`. Do not put React components here.
