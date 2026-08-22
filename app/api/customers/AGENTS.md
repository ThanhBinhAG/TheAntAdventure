# app/api/customers — Agent overview

## Role
CRM BFF for Clients: paginated list, detail, create/update/delete with permission checks.

## Contents
- `route.ts` — GET list (server search/filters), POST create (+ optional lead/comm)
- `[id]/route.ts` — GET detail, PATCH form/notes, DELETE (booking RESTRICT → 409)

## Boundaries
- Domain logic: `lib/customers/customer-repository.ts` + Zod in `customer-list-input.ts`.
- Handlers must call `checkPermissionForRequest`; middleware skips duplicate Auth redirect for this subtree.
- Do not expose service-role or raw Supabase rows beyond mapped DTOs.
