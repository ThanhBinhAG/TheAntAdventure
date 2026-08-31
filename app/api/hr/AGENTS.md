# app/api/hr/ — Agent overview

## Role
Permissioned CRM BFF endpoint for HR staff directory read.

## Contents
- `route.ts` — `GET` staff list (no salary fields)

## Boundaries
- Delegate to `lib/hr/hr-repository`.
- Auth via `bffRoute` (`hr.read`).
