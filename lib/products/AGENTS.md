# lib/products/ — Agent overview

## Role
Product catalogue forms, modules, display, portfolio XLSX, replace-catalogue.

## Contents
- `product-repository.ts` — Server-only repository for Supabase CRUD and atomic full-catalogue import.
- `product-form.ts`, `product-modules.ts`, `product-pricing-helpers.ts`, `replace-catalogue.ts`, …
- `product-list-input.ts` / `product-list-server.ts` — paginated catalogue + facets RPCs (page thumbs via `product_photos`).
- `product-facets-client.ts` — authenticated client trigger to invalidate Redis facets after catalogue writes.

## Boundaries
- Catalog price lists: `lib/pricing`. UI: `components/products`.
