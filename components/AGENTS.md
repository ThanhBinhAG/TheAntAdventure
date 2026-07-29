# components/ — Agent overview

## Role
React UI: CRM chrome at root, page shells in `pages/`, and domain widgets in sibling folders. Domain logic belongs in `lib/<domain>/`.

## Contents
- Root: `Sidebar`, `Topbar`, `StoreProvider`, `AiCopilot*`, `AutoSyncListener`, `PaginationBar`, …
- `pages/` — slug → page components for `(crm)/[page]`
- `tour-design/` — Tour Design wizard steps (URL slug still `tourdesign`)
- `pricing/`, `products/`, `suppliers/`, `attractions/`, `gallery/`, `customers/`
- Thin domains: `agents/`, `guides/`, `planner/`, `weather/`, `auth/`, `system/`

## Boundaries
- Import from `@/lib/...` for business logic; keep components presentational when possible.
- `StorageImage` lives in `gallery/` (not a separate media folder).
