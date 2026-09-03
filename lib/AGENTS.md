# lib/ — Agent overview

## Role
Domain logic, Zustand store, shared types, Supabase sync, and seeds. UI stays in `components/`; route handlers in `app/api/`.

## Contents
- Root: `store.ts`, `types.ts`, `constants.ts`, `env.ts`, `toast.ts` (toast bus), `confirm.ts` (in-app confirm dialog), `confirm-discard.ts` (unsaved-form leave prompt), `confirm-leave-draft.ts` (Stay / Discard / Save draft)
- Domains: `customers/`, `agents/`, `sales/`, `bookings/`, `feedback/`, `finance/`, `tax/`, `hr/`, `salary/`, `dev-notes/`, `cal-events/`, `tour-design/`, `proposals/`, `outline/`, `pricing/`, `products/`, `form-drafts/`, …
- Infra: `db/` (sync-config, mappers, sync-guard), `supabase/` (server-only), `auth/`, `storage/`, `image-pipeline/`, `system/`, `i18n/`, `seeds/`
- Cross-cutting: `core/`, `dashboard/`, `contracts/`, `planner/`, `gallery/`, `weather/`, `attractions/`, `suppliers/`, `sidebar/`, `form-drafts/`

## Boundaries
- Prefer `@/lib/<domain>/...` imports; avoid dumping new helpers at lib root unless truly global.
- One photo pipeline: `gallery/` = UX/API client; `storage/` = limits/paths/persist;
  `image-pipeline/` = Sharp worker + chunk sessions. All gallery uploads write to `photos`.
- When splitting large modules (especially `lib/db/`), keep **stable public import paths** via barrel re-exports so callers do not churn.
- `outline/` = HTML/print; gates/workflow in `tour-design/`.
- `toast.ts` / `confirm.ts` / `confirm-discard.ts` / `confirm-leave-draft.ts` are UI chrome only — hosts in `components/ToastHost` and `components/ConfirmHost`; modals use `hooks/useConfirmClose`.
- Browser form drafts (Clients / B2B Agents): `form-drafts/` localStorage helpers — not server-synced.
