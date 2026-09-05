# app/api/ — Agent overview

## Role
Next.js Route Handlers for server-side auth, media, exports, weather, and diagnostics.

## Contents
- `auth/` — login, logout, users, permissions (parent `AGENTS.md`; leaf folders may omit AGENTS)
- `access-control/` — users, staff-roles, audit-logs, login-history, super-admin-status
- `branding/` — company logo (`logo/route.ts`)
- `photos/` — gallery pipeline: `all`, `upload/{init,chunk,complete}`, `delete`
- `products/` — paginated catalogue, hydration routes, facets, pricing, and XLSX imports
- `customers/` — Clients BFF: list/search/pagination + CRUD + email-check
- `agents/` — B2B Agents BFF: list/search/pagination + CRUD
- `bookings/` — Bookings BFF: list + create/update
- `contracts/` — Contracts BFF: list + create/update (no delete)
- `feedback/` — Post-tour feedback BFF: list + create
- `finance/` — Finance / AR / AP aggregate read
- `tax-reports/` — Tax reports read + CSV export
- `hr/` — HR staff directory read
- `salary/` — Salary payroll staff read
- `dev-notes/` — Dev Notes list/create/update
- `cal-events/` — Guide calendar events list/create/delete
- `hotels/` — Hotels BFF (+ nested rooms): list/create + `[id]` read/update/delete
- `transport/` / `restaurants/` / `cruises/` — QuickList supplier BFFs
- `suppliers/` — Extended suppliers BFF (`suppliers` + tags)
- `leads/` — Sales Pipeline BFF: list/filters, patch, confirm booking, approve outline
- `planner/` — daily planner (tasks) CRUD and hydration endpoints
- `attractions/` — province attractions CRUD and hydration endpoints
- `tour-design/` — tour drafts and outlines safe saving and hydration endpoints
- `dashboard/` — aggregate Dashboard KPIs / charts (`dashboard.read`)
- `pricing/` — pricing PDF export (`export/`)
- `proposals/` — proposal PDF export (`export/`) + company templates (`templates/`)
- `weather/` — boot, weekly, refresh, destination(s), featured
- `sidebar/` — badge counts (`badges/`)
- `settings/` — CRM Settings catalogs BFF (`catalogs`)
- `system/` — diagnostics, log, logs
- `health/` — health check

## Boundaries
- Call into `lib/*` for domain logic; keep handlers thin.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client.
- Prefer parent-folder AGENTS maps over proliferating empty leaf AGENTS; leaves stay short when present.
