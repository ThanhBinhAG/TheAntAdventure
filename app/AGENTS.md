# app/ — Agent overview

## Role
Next.js App Router entry: global layout/CSS, CRM route group, login, system debug, and REST API handlers. Almost all CRM screens live in `components/pages`; this tree wires routes and server endpoints.

## Contents
- `(crm)/` — CRM chrome layout + dynamic `[page]` slug
- `api/` — Route handlers (auth, photos, pricing, proposals, weather, system, health)
- `login/` — Auth UI outside CRM shell
- `system/` — Token-gated diagnostics page
- `layout.tsx`, `globals.css`, `page.tsx`, `robots.ts`, `global-error.tsx` — shell / root redirect / SEO

## Boundaries
- Prefer adding CRM screens under `components/pages` + `VALID_PAGES`, not new App Router pages.
- Keep secrets and service-role usage in API/server code only.
