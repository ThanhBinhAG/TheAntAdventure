# components/sales/ — Agent overview

## Role
Sales pipeline CRM UI (list, pipe cards, policy view, follow-up cells).

## Contents
- `SalesPage.tsx` — main Sales screen; compact horizontal kanban (scroll columns, capped height, hide empty stages); page shell is `pages/Sales.tsx`
- `SalesWidgets.tsx` — PipeCard, policy view, list helpers

## Boundaries
- Domain logic: `lib/sales`. Keep `pages/Sales.tsx` thin.
