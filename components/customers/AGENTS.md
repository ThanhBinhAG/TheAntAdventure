# components/customers/ — Agent overview

## Role
Customer form and profile modal UI.

## Contents
- Client form/profile modals — list via `useCustomerPage`; profile tabs via `useCustomerProfile`; catalogs hydrate from `/api/settings/catalogs` (manage in Settings); Expected Travel Date uses `TravelMonthPicker`; drafts via `FormDraftsBar`

## Boundaries
- Form/onboarding logic: `lib/customers` (`customer-delete.ts` for guard/cleanup).
