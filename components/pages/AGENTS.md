# components/pages/ — Agent overview

## Role
CRM page shells registered in `PAGE_COMPONENTS` / `index.ts`. One file (or thin wrapper) per nav slug.

## Contents
- `index.ts` — page map
- Domain pages: Dashboard, Sales, TourDesign, Products, Gallery, Pricing*, …

## Boundaries
- Heavy widgets live in sibling domain folders (`tour-design/`, `products/`, …).
- New page = add slug constants + export here + wire `[page]` (already dynamic).
