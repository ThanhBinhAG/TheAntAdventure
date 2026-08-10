# lib/db/ — Agent overview

## Role
Supabase hydrate, push, auto-sync, mappers, and timeouts.

## Contents
- `hydrate.ts` — route boot (`ensurePageBootLoaded`) + `ensureTablesLoaded` / sidebar idle / lazy profile tables
- `route-cache.ts` — sessionStorage route snapshot (5 min TTL, 60s revalidate min) for faster F5
- `shell-cache.ts` — deprecated re-exports of route cache
- `sync-config.ts` — `PAGE_BOOT_TABLES`, `SIDEBAR_IDLE_TABLES`, push waves, store key map
- `sync-lifecycle.ts` — phase + `hydratedTables` / messages flags (auto-sync only pushes hydrated)
- `sync-push.ts`, `mappers.ts`, `auto-sync.ts`, `supabase.ts` (embedded selects), …

## Boundaries
- Browser client: `lib/supabase`. Do not put UI here.
- Auto-sync / push must never write unhydrated tables (empty local arrays).
- Route cache stores only `PAGE_BOOT_TABLES[lastSlug]` (minus photos/photo_folders) — never persist full CRM or messages in sessionStorage.
