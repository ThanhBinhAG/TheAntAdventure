# app/api/products/facets — Agent overview

## Role
Filter facet payload for Tour Products catalog (categories, destinations, pricing pulse).

## Contents
- `route.ts` — GET facets for the current filter set; Redis-cached in `lib/redis/product-facets`.

## Boundaries
- List grid paints from `/api/products` without waiting on this route.
- Query logic: `listProductFacets` in `lib/products/product-list-server.ts`.
