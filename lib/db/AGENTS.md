# lib/db/ — Agent overview

## Role
Store↔table mapping config, BFF-managed table guards, row mappers, and mutation sync guard for Zustand mirrors.

## Contents
- `sync-config.ts` — `SYNC_ARRAY_TABLES`, `TABLE_TO_STORE_KEY`, `SIDEBAR_BADGE_TABLES`, `MESSAGES_TABLE`, `countBackupRows`
- `sync-guard.ts` — `withoutAutoSyncAsync` no-op (legacy auto-sync removed D2.13); BFF hooks wrap store writes
- `bff-managed-tables.ts` — tables excluded from any future browser snapshot pushes
- `sidebar-badge-tables.ts` — permission-scoped subset for sidebar badge API
- `mappers.ts` (barrel → [`mappers/`](mappers/AGENTS.md)) — pure row ↔ domain transforms (server repos)
- `timeout.ts` — shared fetch/DB timeout helpers

## Boundaries
- Browser Supabase I/O and hydrate/auto-sync stack removed (D2.13). Server data access: `lib/supabase/server.ts` + `app/api/*`.
- Do not put UI here.
- Prefer partitioning oversized mapper modules with **barrel re-exports** at `@/lib/db/mappers`.
