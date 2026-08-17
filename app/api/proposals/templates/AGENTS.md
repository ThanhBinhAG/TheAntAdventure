# app/api/proposals/templates/ — Agent overview

## Role
Company proposal template CRUD (B2C/B2B commercial and legal copy).

## Contents
- `route.ts` — GET both variants; PUT one variant. Auth only.

## Boundaries
- Persistence: `lib/proposals/proposal-company-template-server.ts` → `proposal_templates`.
- PDF export stays `../export`. Do not change HTML/PDF layout here.
