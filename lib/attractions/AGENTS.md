# lib/attractions/ — Agent overview

## Role
Attraction display helpers and seed merge into the store.

## Contents
- `attractions-helpers.ts`, `ensure-attraction-seeds.ts`
- `attraction-repository.ts` — Server-only repository for aggregate RPC writes and region-scoped photo reads.

## Boundaries
- UI: `components/attractions`. Do not put React components here.
