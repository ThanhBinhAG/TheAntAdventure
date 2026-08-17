# components/products/ — Agent overview

## Role
Tour product catalogue UI: cards, detail drawer, edit panel, import.

## Contents
- `ProductLibrary.tsx` — catalog grid + filter orchestration
- `ProductFilterBar.tsx` — horizontal command-bar filters (region, destination, duration, category, pricing)
- `DestFilterCombobox.tsx` — searchable destination filter with counts
- Product cards, drawers, edit panel, import UI

## Boundaries
- Forms/modules/pricing helpers: `lib/products`. Photos via `gallery/` (page-level `ensureTablesLoaded` after boot; edit panel still ensures on open).
- Filter constants: `lib/products/product-filter-constants.ts`.
- Catalog/drawer heroes use `StorageImage` with `unoptimized` — load Storage thumbs/URLs directly (no `/_next/image` proxy hop).
- Catalog cards prefer store photos when hydrated; otherwise `coverThumbUrl` from `/api/products`.
