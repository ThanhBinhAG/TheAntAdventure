# app/api/agents — Agent overview

## Role
CRM BFF for B2B Agents: paginated list, detail, create/update/delete with permission checks.

## Contents
- `route.ts` — GET list (server search/pagination), POST create
- `[id]/route.ts` — GET detail, PATCH form, DELETE (`AGT-001` → 409)

## Boundaries
- Domain logic: `lib/agents/agent-repository.ts` + Zod in `agent-list-input.ts`.
- Handlers must call `checkPermissionForRequest`. Repository uses `getServerSupabaseClient()`.
- Do not expose service-role or raw Supabase rows beyond mapped DTOs.
