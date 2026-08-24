# app/api/leads — Agent overview

## Role
CRM BFF for Sales Pipeline: paginated/filtered lead list, detail, patch, confirm booking, approve outline.

## Contents
- `route.ts` — GET list (server filters/sort; `scope=list|pipeline`)
- `[id]/route.ts` — GET detail, PATCH stage/follow-up/lost
- `[id]/confirm/route.ts` — POST Confirmed + booking insert
- `[id]/approve-outline/route.ts` — POST outline approve workflow

## Boundaries
- Domain logic: `lib/sales/lead-repository.ts` + Zod in `lead-list-input.ts`.
- Handlers must call `checkPermissionForRequest` (`sales.read` / `sales.write`).
- Repository uses `getServerSupabaseClient()`; tour draft writes via `saveTourDesignServer`.
