# components/contracts/ — Agent overview

## Role
Contracts CRM UI: list, create modal, preview/status, print helpers.

## Contents
- `ContractsPage.tsx` — list, KPI, preview/status, delete
- `ContractFormModal.tsx` — create-only modal with booking autofill + client combobox
- `ContractClientNameCombobox.tsx` — client name typeahead (customers + bookings)

## Boundaries
- Reads/writes go through Contracts BFF hooks (`useContractsPage` / create / update).
- Booking picker catalog via `useEnsureBookingsCatalogLoaded` (Bookings BFF).
- Print/Word stay client-side via `lib/contracts/contract-html`.
