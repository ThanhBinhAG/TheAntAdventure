# lib/ — Agent overview

## Role
Domain logic, Zustand store, shared types, Supabase sync, and seeds. UI stays in `components/`; route handlers in `app/api/`.

## Contents
- Root: `store.ts`, `types.ts`, `constants.ts`, `env.ts`, `toast.ts` (toast bus), `confirm.ts` (in-app confirm dialog)
- Domains: `customers/`, `sales/`, `tour-design/`, `proposals/`, `outline/`, `pricing/`, `products/`, …
- Infra: `db/` (hydrate/sync), `supabase/` (client), `auth/`, `storage/`, `image-pipeline/`, `system/`, `i18n/`, `seeds/`
- Cross-cutting: `core/`, `dashboard/`, `context/`, `contracts/`, `planner/`, `gallery/`, `weather/`, `attractions/`, `suppliers/`, `sidebar/`

## Boundaries
- Prefer `@/lib/<domain>/...` imports; avoid dumping new helpers at lib root unless truly global.
- One photo pipeline: `gallery/` = UX/API client; `storage/` = limits/paths/persist;
  `image-pipeline/` = Sharp worker + chunk sessions. All gallery uploads write to `photos`.
- When splitting large modules (especially `lib/db/`), keep **stable public import paths** via barrel re-exports so callers do not churn.
- `outline/` = HTML/print; gates/workflow in `tour-design/`.
- `toast.ts` / `confirm.ts` are UI chrome only — hosts in `components/ToastHost` and `components/ConfirmHost`.
