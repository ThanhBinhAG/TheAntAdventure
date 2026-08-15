# lib/products/ — Agent overview

## Role
Product catalogue forms, modules, display, portfolio XLSX, replace-catalogue.

## Contents
- `product-form.ts`, `product-modules.ts`, `product-pricing-helpers.ts`, `replace-catalogue.ts`, …
- `product-facets-client.ts` — authenticated client trigger to invalidate Redis facets after catalogue writes.

## Boundaries
- Catalog price lists: `lib/pricing`. UI: `components/products`.
