# components/suppliers/ — Agent overview

## Role
Supplier / hotel list and quick-edit UI (BFF-backed).

## Contents
- Supplier tables, extended lists, modals
- Page shell: `components/pages/Suppliers.tsx` loads via `useSuppliersPage`

## Boundaries
- Filters/seeds: `lib/suppliers`. Mutations: hooks `useHotelMutations` / `useQuickListMutations` / `useExtendedSupplierMutations` — no Zustand auto-sync writes.
