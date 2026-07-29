# lib/ — Agent overview

## Role
Domain logic, Zustand store, shared types, Supabase sync, and seeds. UI stays in `components/`; route handlers in `app/api/`.

## Contents
- Root: `store.ts`, `types.ts`, `constants.ts`, `env.ts`
- Domains: `customers/`, `sales/`, `tour-design/`, `proposals/`, `outline/`, `pricing/`, `products/`, …
- Infra: `db/` (hydrate/sync), `supabase/` (client), `auth/`, `storage/`, `system/`, `i18n/`, `seeds/`
- Cross-cutting: `core/`, `dashboard/`, `context/`, `contracts/`, `planner/`, `gallery/`, `weather/`, `attractions/`, `suppliers/`

## Boundaries
- Prefer `@/lib/<domain>/...` imports; avoid dumping new helpers at lib root unless truly global.
- `gallery/` = photo UX/tags/loose-save; `storage/` = paths/variants/uploads.
- `outline/` = HTML/print; gates/workflow in `tour-design/`.
