# app/api/finance/ — Agent overview

## Role
Permissioned CRM BFF endpoint for Finance / AR / AP aggregate read.

## Contents
- `route.ts` — `GET` bundle `{ finance, ar, ap }`

## Boundaries
- Delegate to `lib/finance/finance-repository`.
- Auth via `bffRoute` (`finance.read`).
