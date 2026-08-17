# components/pages/ — Agent overview

## Role
CRM page shells registered in `PAGE_COMPONENTS` / `index.ts`. One file (or thin wrapper) per nav slug.

## Contents
- `index.ts` — page map
- Domain pages: Dashboard, Sales, TourDesign, Products, Gallery, Pricing*, …

## Boundaries
- **Thin shell required** — prefer re-export into `components/<domain>/` (canonical: `AccessControl.tsx` → `access-control/`). Soft target ~50 lines; split before exceeding ~400.
- Heavy widgets live in sibling domain folders (`tour-design/`, `gallery/`, `products/`, `sales/`, …).
- New page = add slug constants + export here + wire `[page]` (already dynamic).
- See `.cursor/rules/thin-page-shells.mdc`.
