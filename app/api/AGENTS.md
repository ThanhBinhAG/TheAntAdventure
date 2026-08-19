# app/api/ — Agent overview

## Role
Next.js Route Handlers for server-side auth, media, exports, weather, and diagnostics.

## Contents
- `auth/` — login, logout, users, permissions (parent `AGENTS.md`; leaf folders may omit AGENTS)
- `access-control/` — users, staff-roles, audit-logs, login-history, super-admin-status
- `branding/` — company logo (`logo/route.ts`)
- `photos/` — gallery pipeline: `upload/{init,chunk,complete}`, `delete`
- `products/` — paginated catalogue, hydration routes, facets, pricing, and XLSX imports
- `planner/` — daily planner (tasks) CRUD and hydration endpoints
- `pricing/` — pricing PDF export (`export/`)
- `proposals/` — proposal PDF export (`export/`) + company templates (`templates/`)
- `weather/` — boot, weekly, refresh, destination(s), featured
- `sidebar/` — badge counts (`badges/`)
- `system/` — diagnostics, log, logs
- `health/` — health check

## Boundaries
- Call into `lib/*` for domain logic; keep handlers thin.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client.
- Prefer parent-folder AGENTS maps over proliferating empty leaf AGENTS; leaves stay short when present.
