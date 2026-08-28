# app/api/contracts/ — Agent overview

## Role
Permissioned CRM BFF endpoints for Contracts list/create/update.

## Contents
- `route.ts` — `GET` list, `POST` create
- `[id]/route.ts` — `GET` one, `PATCH` update

## Boundaries
- Delegate validation and data logic to `lib/contracts`.
- Auth/permissions via `bffRoute` (`contracts.read` / `contracts.write`).
- No `DELETE` — UI does not support delete/archive (deferred).
