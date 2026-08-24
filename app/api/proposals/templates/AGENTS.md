# app/api/proposals/templates/ — Agent overview

## Role
Company proposal template CRUD (B2C/B2B commercial and legal copy).

## Contents
- `route.ts` — GET requires `tour_design.read`; PUT requires `tour_design.write` and validates the saved field shape.

## Boundaries
- Persistence: `lib/proposals/proposal-company-template-server.ts` → `proposal_templates`, using the BFF user-scoped Supabase client.
- PDF export stays `../export`. Do not change HTML/PDF layout here.
