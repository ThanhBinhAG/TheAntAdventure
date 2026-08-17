# lib/db/supabase/ — Agent overview

## Role
Embedded PostgREST sync/get for CRM tables (tagged, simple, nested). Public API is `db` via `lib/db/supabase.ts`.

## Contents
- `shared.ts` — `Row`, `supabase()`, `HANDLERS`, `countTable`, `deleteOrphans`
- `generic-sync.ts` — tagged/simple sync + get + `upsertSimpleRows` (no orphan delete)
- `nested-sync.ts` — bookings, hotels, products, attractions (+ child rows)
- `table-api.ts` — `makeTableApi` per `SyncArrayTable`
- `db.ts` — `syncMessages`, `export const db` (healthCheck self-refs `db`)

## Boundaries
- Behavior-preserving split only; consumers import `@/lib/db/supabase` (`db`).
- Do not add a public barrel that re-exports internals unless a caller already needed them.
- Browser client stays in `lib/supabase`; this folder is sync I/O only.
