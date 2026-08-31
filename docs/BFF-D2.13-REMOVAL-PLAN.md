# D2.13 — Remove browser Supabase data stack (plan)

**Date:** 2026-08-31  
**Prerequisite:** D2.12 audit PASS ([`BFF-D2.12-MUTATION-AUDIT.md`](BFF-D2.12-MUTATION-AUDIT.md)); Team Chat excluded (D2.11).  
**Owner:** Dev 2  
**Related:** [`BFF-TASK.md`](BFF-TASK.md) D2.13

## Goal

Delete or retire all browser-side Supabase data I/O so CRM cannot accidentally hydrate, auto-sync, or push business data from the client—even if env flags are misconfigured.

## Current state (2026-08-31)

| Layer | Status |
|-------|--------|
| Runtime kill-switch | `isRemoteDataEnabled()` / `isAutoSyncEnabled()` = false in [`lib/env.ts`](../lib/env.ts) |
| Route boot | All `PAGE_BOOT_TABLES` entries `[]` in [`lib/db/sync-config.ts`](../lib/db/sync-config.ts) |
| BFF denylist | 28/28 sync tables in [`lib/db/bff-managed-tables.ts`](../lib/db/bff-managed-tables.ts) |
| Legacy code | Still present: hydrate, auto-sync, sync-push, `table-api` PostgREST fallback, migration UI |

## Removal phases

### Phase A — UI lifecycle (low risk, high visibility)

1. Remove [`components/AutoSyncListener.tsx`](../components/AutoSyncListener.tsx) mount from [`components/StoreProvider.tsx`](../components/StoreProvider.tsx).
2. Remove or no-op migration controls (Push / Verify / Complete Migration) from `StoreProvider` and Topbar.
3. Remove [`components/PageDataGate.tsx`](../components/PageDataGate.tsx) wrapper from CRM shell (or replace with permission-only gate).
4. Remove [`lib/context/SupabaseContext.tsx`](../lib/context/SupabaseContext.tsx) if no longer referenced.

**Acceptance:** CRM shell boots without hydrate pending state; no Topbar sync panel.

### Phase B — Browser Supabase client

1. Delete [`lib/supabase/client.ts`](../lib/supabase/client.ts).
2. Remove browser singleton from [`lib/supabase/index.ts`](../lib/supabase/index.ts).
3. Grep production source for `createBrowserClient` — must be zero.

**Acceptance:** `npm run leakage:check` still pass; no client import of `@supabase/ssr` browser helpers.

### Phase C — Hydrate stack

1. Delete [`lib/db/hydrate/`](../lib/db/hydrate/) internals and [`lib/db/hydrate.ts`](../lib/db/hydrate.ts) facade (or reduce to health-ping only if still needed).
2. Remove `ensurePageBootLoaded`, `ensureAllTablesLoaded`, `ensureMessagesLoaded` callers.
3. Delete deprecated [`lib/db/shell-cache.ts`](../lib/db/shell-cache.ts) shim if unused.
4. Trim [`lib/db/sync-config.ts`](../lib/db/sync-config.ts): `PAGE_BOOT_TABLES`, `SHELL_HYDRATE_TABLES`, push waves used only by migration.

**Acceptance:** No browser import of `lib/db/hydrate`; tests updated.

### Phase D — Auto-sync stack

1. Delete [`lib/db/auto-sync.ts`](../lib/db/auto-sync.ts).
2. Delete [`lib/db/sync-push.ts`](../lib/db/sync-push.ts) and [`lib/db/remote-delete.ts`](../lib/db/remote-delete.ts) if only used by auto-sync/migration.
3. Simplify [`lib/db/sync-lifecycle.ts`](../lib/db/sync-lifecycle.ts) to UI-only flags or remove.
4. Remove `chat_messages` push path in [`lib/db/supabase/db.ts`](../lib/db/supabase/db.ts) browser bundle (server-only if Team Chat ships later).

**Acceptance:** `grep scheduleAutoSync` / `pushTablesToSupabase` in `components/` and `hooks/` = 0.

### Phase E — Browser `lib/db/supabase`

1. Retire browser I/O in [`lib/db/supabase/`](../lib/db/supabase/) — keep pure row mappers under [`lib/db/mappers/`](../lib/db/mappers/) for server repositories.
2. Remove PostgREST fallback branches in `table-api.ts`.
3. Ensure no Client Component imports `lib/db/supabase`.

**Acceptance:** Server repositories unchanged; browser bundle has no PostgREST client.

### Phase F — Zustand boundary cleanup

1. Audit store actions that imply DB replica (`exportBackup`, migration helpers).
2. Document Zustand as UI cache + optimistic state only.
3. Remove `rolloverIncompleteTasks` hydration coupling if tasks always load via `/api/planner`.

**Acceptance:** Store no longer described as full DB mirror in docs.

## Test updates

| Test file | Action |
|-----------|--------|
| `tests/b7-dev-b-hydrate-cutover.test.ts` | Keep denylist assertions; remove hydrate API expectations if deleted |
| `tests/a6-scoped-hydrate-cutover.test.ts` | Convert to “no hydrate routes” invariant |
| `tests/dev-a-full-hydrate-cutover.test.ts` | Retire or replace |
| `tests/gallery-bff.test.ts` | Keep “no pushTablesToSupabase” assertion |
| Per-domain BFF tests | Must still pass |

Run full gate:

```bash
npm run final:acceptance
```

## Rollback strategy

- Keep D2.13 work on feature branch until `final:acceptance` green.
- Do **not** re-enable `NEXT_PUBLIC_SUPABASE_*` env in browser.
- If production needs emergency data repair, use server-side scripts or Supabase Studio on private network—not browser migration UI.

## Out of scope (D2.13)

- Team Chat BFF (D2.11 — excluded).
- Asset URL normalization (D2.14).
- Dev 1 production network / key rotation (D1.3).

## Suggested branch

```text
feature/bff-dev2-remove-browser-supabase-stack
```

## Estimated order of PRs

1. Phase A (UI removal) — smallest user-visible change.
2. Phases B–E (lib deletion) — single PR or split B+C vs D+E.
3. Phase F + test cleanup + doc update.
