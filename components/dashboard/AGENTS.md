# components/dashboard/ — Agent overview

## Role
Dashboard CRM UI (metrics, forecast breakdown, summary widgets).

## Contents
- `DashboardPage.tsx` — main screen; data via `useDashboardPage` → `/api/dashboard`
- `DashboardForecast.tsx` — pipeline forecast table from BFF deal DTOs

## Boundaries
- Metrics helpers / repository: `lib/dashboard`. Keep `pages/Dashboard.tsx` thin.
- Do not hydrate CRM tables from the store on this page.
