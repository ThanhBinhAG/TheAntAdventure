# D2.12 — Cross-domain mutation audit

**Date:** 2026-08-31  
**Branch baseline:** `dev` @ `a0500cd`  
**Owner:** Dev 2  
**Related:** [`BFF-TASK.md`](BFF-TASK.md) D2.12, [`lib/db/bff-managed-tables.ts`](../lib/db/bff-managed-tables.ts)

## Summary

| Check | Result |
|-------|--------|
| All `SYNC_ARRAY_TABLES` in `BFF_MANAGED_TABLES` | **PASS** — 28/28 |
| Business writes via BFF before Zustand mirror | **PASS** — no dual-write detected |
| Generic auto-sync pushes CRM tables | **BLOCKED** — `filterBffManagedTables` + `isAutoSyncEnabled()` = false |
| Team Chat persistence | **N/A** — excluded (local-only UI; see D2.11) |
| Raw Supabase rows in API responses | **PASS** — per-domain contract tests |

Runtime boundary: [`lib/env.ts`](../lib/env.ts) disables browser remote hydrate/sync. Legacy stack remains mounted but inert until D2.13 removal.

---

## Auto-sync and hydrate remnants

| Module | Role today | Risk if env re-enabled |
|--------|------------|------------------------|
| [`lib/db/auto-sync.ts`](../lib/db/auto-sync.ts) | Debounced push; filters BFF-managed tables | Would push only `messages` (`chat_messages`) |
| [`lib/db/sync-push.ts`](../lib/db/sync-push.ts) | Full-table / row push | Migration UI in `StoreProvider` could push non-BFF tables |
| [`lib/db/hydrate/*`](../lib/db/hydrate/) | Route boot / full hydrate | All `PAGE_BOOT_TABLES` are `[]`; no-op for data |
| [`components/AutoSyncListener.tsx`](../components/AutoSyncListener.tsx) | Subscribes to Zustand | Dormant while auto-sync disabled |
| [`components/StoreProvider.tsx`](../components/StoreProvider.tsx) | Push / Verify / Complete Migration | Dangerous if `isRemoteDataEnabled()` flipped true |
| [`lib/db/supabase/table-api.ts`](../lib/db/supabase/table-api.ts) | Hybrid BFF fetch + PostgREST fallback | Fallback only used when remote enabled |

**Only non-BFF sync table:** `chat_messages` (`MESSAGES_TABLE` in sync-config). Team Chat UI does not write to store; excluded from cutover gate.

---

## Domain mutation inventory

Pattern codes:

- **BFF→mirror** — `fetch('/api/...')` succeeds, then Zustand updated (often inside `withoutAutoSyncAsync`).
- **BFF hook** — dedicated hook wraps fetch + mirror + rollback.
- **BFF inline** — page/component calls `fetch` directly, then updates store.
- **Read-only** — no business mutations in UI.
- **Local-only** — no server persistence.

### Dev B (stage 1)

| Domain | Route | Tables | Write pattern | Hooks / callers | Tests |
|--------|-------|--------|---------------|-----------------|-------|
| Clients | `/customers` | `customers`, `leads`, `comms` | BFF hook | `useRegisterCustomer`, `useDeleteCustomer`, `useCustomerProfileMutations`, `CustomerProfileModal` | `tests/customers-bff.test.ts` |
| Agents | `/agents` | `agents` | BFF hook | `useRegisterAgent`, `useDeleteAgent` | `tests/agents-bff.test.ts` |
| Sales | `/sales` | `leads`, `comms`, `bookings` | BFF hook | `useUpdateLead`, `useConfirmLead`, `useApproveLeadOutline` | `tests/sales-bff.test.ts` |
| Gallery | `/gallery` | `photos`, `photo_folders` | BFF hook | `useUpdatePhoto`, `useDeletePhoto`, `usePhotoFolderMutations`, `photo-api.ts` upload | `tests/gallery-bff.test.ts` |
| Weather | `/weather` | — | BFF inline | `useWeatherPageBoot`, `useDestinationWeather`, refresh routes | `tests/weather-*.test.ts` |
| Dashboard | `/dashboard` | — | Read-only | `useDashboardPage` | `tests/dashboard-bff.test.ts` |

### Dev A (stage 1)

| Domain | Route | Tables | Write pattern | Hooks / callers | Tests |
|--------|-------|--------|---------------|-----------------|-------|
| Products | `/products` | `products` | BFF inline | `ProductsPage.tsx` → `/api/products` | `tests/tour-product-bff.test.ts` |
| Pricing | `/pricing` | `product_pricing` | BFF inline | `PricingPage.tsx` → `/api/products/pricing`, catalog APIs | `tests/pricing-catalog-bff.test.ts` |
| Planner | `/planner` | `tasks` | BFF inline | `Planner.tsx` → `/api/planner` | `tests/planner-bff.test.ts` |
| Attractions | `/attractions` | `attractions` | BFF inline | `Attractions.tsx` → `/api/attractions` | `tests/attractions-bff.test.ts` |
| Tour Design | `/tourdesign` | `tour_drafts`, `tour_outline_days`, `leads`, `comms` | BFF inline | `TourDesignPage.tsx` save/workflow/ack | `tests/tour-design-*.test.ts` |
| Guides (roster) | `/guides` | `guides` | BFF inline | `GuidesPage.tsx`, `guide-avatar-client.ts` | `tests/guides-bff.test.ts` |
| Proposals | (export step) | — | BFF inline | `ProposalExportStep.tsx` → `/api/proposals/export` | proposal tests |
| Access Control | `/access-control` | — | BFF client module | `access-control-api.ts` | access-control tests |

### Dev 2 (stage 2)

| Domain | Route | Tables | Write pattern | Hooks / callers | Tests |
|--------|-------|--------|---------------|-----------------|-------|
| Bookings | `/bookings` | `bookings` | BFF hook | `useCreateBooking`, `useUpdateBooking` | `tests/bookings-bff.test.ts` |
| Contracts | `/contracts` | `contracts` | BFF hook | `useCreateContract`, `useUpdateContract`, `useDeleteContract` | `tests/contracts-bff.test.ts` |
| Suppliers | `/suppliers` | hotels, transport, restaurants, cruises, `suppliers` | BFF hook | `useHotelMutations`, `useQuickListMutations`, `useExtendedSupplierMutations` | `tests/suppliers-bff.test.ts` |
| Post-tour | `/posttour` | `feedback` | BFF hook | `useCreateFeedback` | `tests/feedback-bff.test.ts` |
| Finance | `/finance` | finance, AR, AP | Read-only | `useFinancePage` | `tests/finance-bff.test.ts` |
| Tax | `/tax` | `tax_reports` | Read-only + export | `useTaxPage`, `TaxPage` export | `tests/tax-bff.test.ts` |
| HR | `/hr` | `staff` | Read-only | `useHrPage` | `tests/hr-bff.test.ts` |
| Salary | `/salary` | `staff` | Read-only | `useSalaryPage` | `tests/salary-bff.test.ts` |
| Dev Notes | `/devnotes` | `dev_notes` | BFF hook | `useCreateDevNote`, `useUpdateDevNote`, `useDeleteDevNote` | `tests/dev-notes-bff.test.ts` |
| Guide Calendar | `/guides` (tab) | `cal_events` | BFF hook | `useCreateCalEvent`, `useDeleteCalEvent` | `tests/cal-events-bff.test.ts` |

### Excluded / server-only

| Domain | Route | Notes |
|--------|-------|-------|
| Team Chat | `/teamchat` | **Local-only** — `TeamChat.tsx` `localMsgs`; seed from `store.messages`; no `/api/chat*` |
| Branding | Topbar / About | `company-logo-client.ts` → `/api/branding/logo` |
| Auth | `/login` | `/api/auth/*` — platform (Dev 1) |
| System | debug | `/api/system/*` — diagnostics only |

---

## Zustand mirror after BFF (expected)

Store updates **after** successful API calls are intentional UI cache mirrors, not generic auto-sync writes. Examples:

- `PricingPage.tsx` — `upsertProductPricing` after `PATCH /api/products/pricing`
- `Attractions.tsx` — `addAttraction` / `updateAttraction` after `/api/attractions`
- `GalleryWorkspace.tsx` — `withoutAutoSyncAsync` + `setState` after upload complete
- `TourDesignPage.tsx` — draft/outline state after `/api/tour-design/save`

No path found where BFF-managed table mutations rely solely on `scheduleAutoSync` without a preceding BFF call.

---

## API response boundary

Repositories under `lib/<domain>/` map DB rows to minimal DTOs. Contract tests assert:

- `401` / `403` / `422` on auth and validation failures
- Success payloads exclude raw Supabase shapes
- Sensitive fields gated (e.g. HR DTO excludes `baseSalary`)

---

## Findings and follow-ups

1. **D2.12 audit: PASS** for all in-scope CRM sync tables.
2. **Team Chat** excluded — document in D2.11; not a D2.12 blocker.
3. **D2.13** — remove legacy stack so re-enabling env cannot resurrect PostgREST paths.
4. **D2.14** — separate asset URL audit; gallery/logo partially on CRM routes already.
5. **Defense in depth** — extend `ROUTE_CACHE_DENYLIST` to full `BFF_MANAGED_TABLES` during D2.13 (low risk while boot empty).

---

## Verification commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run leakage:check
```

Domain BFF contract tests: see [`Personal/docs/stage-2/checklist.md`](../Personal/docs/stage-2/checklist.md) Commands section.
