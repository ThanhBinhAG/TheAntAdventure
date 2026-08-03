# tests/ — Agent overview

## Role
Unit tests for `lib/` domain logic (Vitest / `tsx --test`). Flat layout by domain topic.

## Contents
- `*.test.ts` covering sales, products, tour-design, gallery, auth, weather, sync, …

## Boundaries
- Prefer testing `lib/` pure functions; avoid brittle UI snapshots unless needed.
