# components/tax/ — Agent overview

## Role
Tax Reports read-only UI with period filter, summary toast, and CSV export.

## Contents
- `TaxPage.tsx` — tax table, calculate quarter, export

## Boundaries
- Data via `useTaxPage` and `/api/tax-reports`; export via `/api/tax-reports/export`.
