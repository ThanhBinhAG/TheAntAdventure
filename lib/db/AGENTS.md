# lib/db/ — Agent overview

## Role
Supabase hydrate, push, auto-sync, mappers, and timeouts.

## Contents
- `hydrate.ts` — public facade for route boot / ensure / full hydrate (re-exports `hydrate/`)
- `hydrate/` — internal split: connection, route-persist, shared guards, page-boot, full-hydrate
  (`bootSettled` session memo, denylist-safe delayed revalidate, ping inflight cache)
- `route-cache.ts` — sessionStorage route snapshot (5 min TTL, 60s revalidate min) for faster F5
- `shell-cache.ts` — **deprecated** compatibility shim over `route-cache.ts`; do not add new callers — use `route-cache` directly.
- `sync-config.ts` — `PAGE_BOOT_TABLES`, `SIDEBAR_BADGE_TABLES`, `PROFILE_LAZY_TABLES`, push waves, store key map
- `sidebar-badge-tables.ts` — permission-scoped subset for sidebar badge hydrate
- `sync-lifecycle.ts` — phase + `hydratedTables` / messages flags; hard `markHydrationPending` (wipe) vs soft `markHydrationSoftPending` (nav); auto-sync only pushes hydrated
- `sync-push.ts` — full-table push + `pushStoreRowsToSupabase` (row upsert for create/edit); excludes BFF-managed Dev A tables
- `auto-sync.ts` — debounce (2.5s) + `{ immediate: true }` + `persistCustomerRowsNow`; ignores store writes while `withoutAutoSyncAsync` is active and excludes BFF-managed tables
- `bff-managed-tables.ts` — blocks Product, Pricing, Planner, Attractions, and Tour Design tables from browser snapshot pushes
- `mappers.ts` (barrel → [`mappers/`](mappers/AGENTS.md)), `supabase.ts` (thin re-export of `db` → [`supabase/`](supabase/AGENTS.md)), …

## Boundaries
- Browser client: `lib/supabase`. Do not put UI here.
- Auto-sync / push must never write unhydrated tables (empty local arrays).
- Route cache stores only `PAGE_BOOT_TABLES[lastSlug]` (minus photos/photo_folders) — never persist full CRM or messages in sessionStorage.
- Prefer partitioning oversized files (`mappers`, `supabase`, `hydrate`) into sibling modules with **barrel re-exports** at the original path (`@/lib/db/mappers`, etc.) so public APIs stay stable.
