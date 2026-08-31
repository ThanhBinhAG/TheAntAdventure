# components/finance/ — Agent overview

## Role
Finance / AR / AP read-only dashboard UI.

## Contents
- `FinancePage.tsx` — KPI cards, overview/cashflow/P&L/AR/AP tabs

## Boundaries
- Data via `useFinancePage` and `/api/finance`; no browser Supabase.
