# lib/agents/ — Agent overview

## Role
B2B agent (sales partner) Zod contracts, id allocation, and server-only repository.

## Contents
- `agent-list-input.ts` — Zod list/create/patch contracts for BFF
- `agent-ids.ts` — `nextAgentId` / protected Direct Client id
- `agent-repository.ts` — `server-only` PostgREST list/CRUD (`getServerSupabaseClient`)

## Boundaries
- HTTP: `app/api/agents`. Browser must not write agents via hydrate/auto-sync hooks.
- Commission math stays in `lib/sales`.
