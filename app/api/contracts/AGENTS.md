# app/api/contracts/ — Agent overview

## Role
Permissioned CRM BFF endpoints for Contracts list/create/update/delete.

## Contents
- `route.ts` — `GET` list, `POST` create
- `[id]/route.ts` — `GET` one, `PATCH` update, `DELETE` remove

## Boundaries
- Delegate validation and data logic to `lib/contracts`.
- Auth/permissions via `bffRoute` (`contracts.read` / `contracts.write`).
