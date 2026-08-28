# components/contracts/ — Agent overview

## Role
Contracts CRM UI: list, create modal, preview/status, print helpers.

## Contents
- `ContractsPage.tsx` — main Contracts screen; page shell is `pages/Contracts.tsx`

## Boundaries
- Reads/writes go through Contracts BFF hooks (`useContractsPage` / create / update).
- Booking picker catalog via `useEnsureBookingsCatalogLoaded` (Bookings BFF).
- Print/Word stay client-side via `lib/contracts/contract-html`.
