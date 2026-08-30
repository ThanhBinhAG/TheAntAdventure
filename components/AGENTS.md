# components/ — Agent overview

## Role
React UI: CRM chrome at root, page shells in `pages/`, and domain widgets in sibling folders. Domain logic belongs in `lib/<domain>/`.

## Contents
- Root: `Sidebar`, `Topbar`, `CRMShell`, `StoreProvider`, `PageDataGate`, `ToastHost`, `ConfirmHost`, `EmptyState` (shared empty lists; `access` variant for PermissionGate), `PermissionGate`, `AiCopilot*`, `AutoSyncListener`, `PaginationBar`, …
- `Sidebar` — `useSidebarBadges` (count API when tables not hydrated; `prefetch={false}` on nav links)
- `sidebar/` — company logo editor (gallery pick + crop)
- `pages/` — slug → page components for `(crm)/[page]`
- `tour-design/` — Tour Design wizard (`TourDesignPage` + steps; URL slug still `tourdesign`)
- `sales/`, `bookings/`, `contracts/`, `dashboard/`, `post-tour/`, `finance/`, `tax/` — page roots for Sales / Bookings / Contracts / Dashboard / Post-tour / Finance / Tax
- `pricing/`, `products/`, `suppliers/`, `attractions/`, `gallery/`, `customers/`
- Thin domains: `agents/`, `guides/`, `planner/`, `weather/`, `auth/`, `system/`

## Boundaries
- Import from `@/lib/...` for business logic; keep components presentational when possible.
- `StorageImage` lives in `gallery/` (not a separate media folder).
- User feedback: `toast` from `@/lib/toast` (`ToastHost`); destructive prompts via `confirmDialog` from `@/lib/confirm` (`ConfirmHost`) — do not use `alert()` / `window.confirm`.
