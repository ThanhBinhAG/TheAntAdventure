# hooks/ — Agent overview

## Role
Shared React hooks for language, pagination, pricing catalog, customer registration, and store access.

## Contents
- `useLanguage.ts`, `usePagination.ts`, `usePageSize.ts`, `usePricingCatalog.ts`, `useRegisterCustomer.ts`, `useStore.ts` (re-export)

## Boundaries
- Domain logic stays in `lib/`; hooks wrap React usage only.
- Page size preference is global (`localStorage` key `crm.pageSize`); list pages should use `usePageSize` with `PaginationBar`.
