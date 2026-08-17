# lib/db/hydrate/ — Agent overview

## Role
Internal modules for route boot, table ensure, connection ping, and full hydrate. Public API stays at `@/lib/db/hydrate` (`hydrate.ts` facade).

## Contents
- `connection.ts` — `checkSupabaseConnection` / `quickSupabasePing` (inflight + 15s result cache) / `ConnectionStatus`
- `route-persist.ts` — session route-cache write helpers
- `shared.ts` — fetch/apply helpers (`resolveFetchTables` / `force` revalidate), table-level fetch inflight, `bootSettled`, `tablesForDelayedRevalidate`, `cancelDelayedRevalidate`, `resetShellHydrateGuard`
- `page-boot.ts` — `ensurePageBootLoaded` (session memo after success; soft pending on nav), ensure tables/messages, route-first `ensurePageDataLoaded`
- `full-hydrate.ts` — full hydrate, verify, clear, migration

## Boundaries
- Do not import these internals from UI; use `@/lib/db/hydrate`.
- Keep shared guards in `shared.ts` only (one module instance).
- Do not change export names on the facade.
