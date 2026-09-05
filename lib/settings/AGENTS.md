# lib/settings/ — Agent overview

## Role
CRM Settings domain: unified lookup catalogs (`crm_catalog_items`) and kind registry for the Settings page and form hydration.

## Contents
- `catalog-kinds.ts` — kind list, labels, `CatalogItem` type
- `catalog-input.ts` — Zod contracts for BFF
- `catalog-repository.ts` — `server-only` list/replace/delete for `crm_catalog_items`

## Boundaries
- Travel styles stay on `travel_styles` (see `lib/customers/travel-style-repository.ts`); Settings API bridges both.
- HTTP: `app/api/settings/catalogs`. UI: `components/settings`.
